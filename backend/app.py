import base64
import io
import json
import os
import re
import ssl
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash")
BACKEND_HOST = os.environ.get("PYTHON_BACKEND_HOST", "127.0.0.1")
BACKEND_PORT = int(os.environ.get("PYTHON_BACKEND_PORT", "9001"))


def load_dotenv_file() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def extract_docx_text(raw_bytes: bytes) -> str:
    """Extract clean text from a .docx archive using Python's standard library."""
    with zipfile.ZipFile(io.BytesIO(raw_bytes)) as archive:
        if "word/document.xml" not in archive.namelist():
            raise ValueError("Invalid DOCX file: missing word/document.xml")
        xml_bytes = archive.read("word/document.xml")

    root = ET.fromstring(xml_bytes)
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs: list[str] = []
    for para in root.findall(".//w:p", ns):
        texts = [node.text for node in para.findall(".//w:t", ns) if node.text]
        joined = "".join(texts).strip()
        if joined:
            paragraphs.append(joined)
    return "\n".join(paragraphs)


def call_gemini(
    parts: list[dict[str, Any]],
    system_instruction: str,
    response_schema: dict[str, Any],
    thinking_level: str = "MEDIUM",
) -> dict[str, Any]:
    import sys

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise PermissionError(
            "GEMINI_API_KEY is not configured. Please check the Settings > Secrets panel."
        )

    base_url = (
        os.environ.get("GOOGLE_GEMINI_BASE_URL")
        or "https://generativelanguage.googleapis.com"
    ).rstrip("/")
    url = f"{base_url}/v1beta/models/{MODEL_NAME}:generateContent"
    payload = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": response_schema,
            "thinkingConfig": {"thinkingLevel": thinking_level},
        },
    }

    body_bytes = json.dumps(payload).encode("utf-8")
    ssl_ctx = ssl.create_default_context()

    last_exc: Exception | None = None
    for attempt in range(3):
        t0 = time.time()
        req = urllib.request.Request(
            url,
            data=body_bytes,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
                "User-Agent": "aistudio-build",
            },
        )
        try:
            open_kwargs: dict[str, Any] = {"timeout": 120}
            if url.startswith("https://"):
                open_kwargs["context"] = ssl_ctx
            with urllib.request.urlopen(req, **open_kwargs) as resp:
                raw = resp.read().decode("utf-8")
                print(
                    f"[gemini] status={resp.status} elapsed={time.time() - t0:.2f}s",
                    file=sys.stderr,
                    flush=True,
                )
                data = json.loads(raw)
                candidates = data.get("candidates") or []
                if not candidates:
                    raise RuntimeError("Gemini returned an empty response.")
                cand_parts = candidates[0].get("content", {}).get("parts", [])
                text_chunks = [p.get("text", "") for p in cand_parts if "text" in p]
                json_text = "".join(text_chunks).strip()
                if not json_text:
                    raise RuntimeError("Gemini returned no structured JSON text.")
                return json.loads(json_text)
        except TimeoutError as err:
            print(
                f"[gemini] timeout attempt={attempt} elapsed={time.time() - t0:.2f}s",
                file=sys.stderr,
                flush=True,
            )
            last_exc = err
            if attempt < 2:
                time.sleep(0.6 * (2 ** attempt))
                continue
            raise GeminiAPIError(504, "Gemini API request timed out. Please try again.")
        except urllib.error.HTTPError as err:
            err_body = err.read().decode("utf-8", errors="replace")
            status = err.code
            print(
                f"[gemini] http_error={status} attempt={attempt} elapsed={time.time() - t0:.2f}s",
                file=sys.stderr,
                flush=True,
            )
            if status in (429, 500, 502, 503, 504) and attempt < 2:
                time.sleep(0.6 * (2 ** attempt))
                last_exc = err
                continue
            if status == 403 or "PERMISSION_DENIED" in err_body:
                raise GeminiAPIError(
                    403,
                    "Gemini API permission denied. Please verify your API key in Settings > Secrets.",
                )
            if status == 400 and "API_KEY_INVALID" in err_body:
                raise GeminiAPIError(
                    400,
                    "Invalid Gemini API key. Please check your key in Settings > Secrets.",
                )
            if status == 429 or "RESOURCE_EXHAUSTED" in err_body:
                raise GeminiAPIError(
                    429,
                    "Rate limit reached on the Gemini API. Please wait a moment and try again.",
                )
            try:
                err_json = json.loads(err_body)
                msg = err_json.get("error", {}).get("message", err_body)
            except Exception:
                msg = err_body or str(err)
            raise GeminiAPIError(status, msg)
        except urllib.error.URLError as err:
            print(
                f"[gemini] url_error={err.reason} attempt={attempt} elapsed={time.time() - t0:.2f}s",
                file=sys.stderr,
                flush=True,
            )
            last_exc = err
            if attempt < 2:
                time.sleep(0.6 * (2 ** attempt))
                continue
            raise GeminiAPIError(502, f"Network error reaching Gemini API: {err.reason}")

    raise GeminiAPIError(500, str(last_exc) if last_exc else "Gemini request failed.")


class GeminiAPIError(Exception):
    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.message = message


ANALYSIS_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "candidateSummary": {
            "type": "OBJECT",
            "properties": {
                "name": {"type": "STRING"},
                "currentRole": {"type": "STRING"},
                "experienceYears": {"type": "STRING"},
                "primaryDomain": {"type": "STRING"},
                "extractedHeadline": {"type": "STRING"},
            },
            "required": [
                "name",
                "currentRole",
                "experienceYears",
                "primaryDomain",
                "extractedHeadline",
            ],
        },
        "overallScore": {"type": "INTEGER"},
        "verdict": {
            "type": "STRING",
            "description": "One of: Strong Match, Competitive, Needs Refinement, Major Gaps",
        },
        "executiveSummary": {"type": "STRING"},
        "dimensionScores": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "name": {"type": "STRING"},
                    "score": {"type": "INTEGER"},
                    "status": {
                        "type": "STRING",
                        "description": "One of: strong, moderate, weak",
                    },
                    "rationale": {"type": "STRING"},
                },
                "required": ["name", "score", "status", "rationale"],
            },
        },
        "matchedKeywords": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "term": {"type": "STRING"},
                    "category": {
                        "type": "STRING",
                        "description": "One of: Technical, Domain, Leadership, Tool",
                    },
                    "evidence": {"type": "STRING"},
                },
                "required": ["term", "category", "evidence"],
            },
        },
        "missingKeywords": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "term": {"type": "STRING"},
                    "priority": {
                        "type": "STRING",
                        "description": "One of: Critical, Recommended, Bonus",
                    },
                    "suggestion": {"type": "STRING"},
                },
                "required": ["term", "priority", "suggestion"],
            },
        },
        "bulletRewrites": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "id": {"type": "STRING"},
                    "section": {"type": "STRING"},
                    "original": {"type": "STRING"},
                    "issue": {"type": "STRING"},
                    "improved": {"type": "STRING"},
                },
                "required": ["id", "section", "original", "issue", "improved"],
            },
        },
        "sectionAudit": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "section": {"type": "STRING"},
                    "present": {"type": "BOOLEAN"},
                    "grade": {
                        "type": "STRING",
                        "description": "One of: Strong, Fair, Needs Work, Missing",
                    },
                    "notes": {"type": "STRING"},
                },
                "required": ["section", "present", "grade", "notes"],
            },
        },
        "priorityChecklist": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "id": {"type": "STRING"},
                    "impact": {
                        "type": "STRING",
                        "description": "One of: High, Medium, Low",
                    },
                    "action": {"type": "STRING"},
                    "expectedLift": {"type": "STRING"},
                },
                "required": ["id", "impact", "action", "expectedLift"],
            },
        },
        "extractedResumeText": {
            "type": "STRING",
            "description": "Clean plain-text transcription of the resume content for downstream editing and reference.",
        },
    },
    "required": [
        "candidateSummary",
        "overallScore",
        "verdict",
        "executiveSummary",
        "dimensionScores",
        "matchedKeywords",
        "missingKeywords",
        "bulletRewrites",
        "sectionAudit",
        "priorityChecklist",
        "extractedResumeText",
    ],
}


REWRITE_BULLET_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "diagnosis": {"type": "STRING"},
        "alternatives": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "label": {"type": "STRING"},
                    "text": {"type": "STRING"},
                },
                "required": ["label", "text"],
            },
        },
    },
    "required": ["diagnosis", "alternatives"],
}


OUTREACH_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "subjectLine": {"type": "STRING"},
        "body": {"type": "STRING"},
    },
    "required": ["subjectLine", "body"],
}


class ResumeAPIHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, format: str, *args: Any) -> None:
        # Keep stdout concise
        pass

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(raw)

    def _read_json_body(self) -> dict[str, Any]:
        length_header = self.headers.get("Content-Length", "0")
        content_length = int(length_header)
        if content_length <= 0:
            return {}
        if content_length > 16 * 1024 * 1024:
            raise ValueError("Request payload exceeds 16 MB limit.")
        raw = self.rfile.read(content_length)
        return json.loads(raw.decode("utf-8"))

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:
        if self.path.rstrip("/") == "/api/health":
            self._send_json(
                200,
                {
                    "ok": True,
                    "backend": "python",
                    "runtime": f"Python {os.sys.version.split()[0]}",
                },
            )
            return
        self._send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        try:
            body = self._read_json_body()
            route = self.path.rstrip("/")

            if route == "/api/analyze":
                self._handle_analyze(body)
            elif route == "/api/rewrite-bullet":
                self._handle_rewrite_bullet(body)
            elif route == "/api/generate-pitch":
                self._handle_generate_pitch(body)
            else:
                self._send_json(404, {"error": "Endpoint not found"})
        except GeminiAPIError as err:
            self._send_json(err.status, {"error": err.message})
        except PermissionError as err:
            self._send_json(403, {"error": str(err)})
        except ValueError as err:
            self._send_json(400, {"error": str(err)})
        except Exception as err:
            self._send_json(500, {"error": f"Server error: {err}"})

    def _handle_analyze(self, body: dict[str, Any]) -> None:
        job_description = str(body.get("jobDescription") or "").strip()
        target_role = str(body.get("targetRole") or "").strip()
        has_jd = len(job_description) > 20
        plain_text_resume = str(body.get("resumeText") or "").strip()
        file_data = body.get("fileData")

        parts: list[dict[str, Any]] = []

        if isinstance(file_data, dict) and file_data.get("base64"):
            b64_str = str(file_data["base64"])
            mime_type = str(file_data.get("mimeType") or "")
            file_name = str(file_data.get("fileName") or "").lower()

            if mime_type == "application/pdf" or file_name.endswith(".pdf"):
                parts.append(
                    {
                        "inlineData": {
                            "mimeType": "application/pdf",
                            "data": b64_str,
                        }
                    }
                )
            elif (
                mime_type
                == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                or file_name.endswith(".docx")
            ):
                raw_bytes = base64.b64decode(b64_str)
                plain_text_resume = extract_docx_text(raw_bytes).strip()
            elif (
                mime_type.startswith("text/")
                or file_name.endswith(".txt")
                or file_name.endswith(".md")
            ):
                plain_text_resume = base64.b64decode(b64_str).decode("utf-8").strip()
            else:
                raise ValueError(
                    "Unsupported file format. Please upload a PDF, DOCX, TXT, or MD file."
                )

        if not parts and len(plain_text_resume) < 40:
            raise ValueError(
                "Please provide a valid resume file or paste at least a short resume summary and experience."
            )

        if has_jd:
            target_context = (
                f"Target Role: {target_role or 'Inferred from Job Description'}\n\n"
                f"Target Job Description:\n{job_description}"
            )
        elif target_role:
            target_context = (
                f"Target Role (No full JD provided; evaluate for this role benchmark): "
                f"{target_role}"
            )
        else:
            target_context = (
                "No target job description provided. Perform a rigorous general executive & ATS resume audit."
            )

        resume_block = (
            f"RESUME TEXT:\n{plain_text_resume}\n\n" if plain_text_resume else ""
        )

        prompt_text = f"""Analyze the attached/provided resume carefully.

{resume_block}TARGET CONTEXT:
{target_context}

Evaluation Instructions:
1. Score overallScore (0-100) honestly and realistically based on ATS parseability, quantified impact, clarity, and alignment with the target role/JD (do not inflate scores).
2. Set verdict strictly to one of: "Strong Match", "Competitive", "Needs Refinement", or "Major Gaps".
3. Provide exactly 5 dimensionScores covering: "ATS & Formatting", "Impact & Metrics", "Skills & Keywords", "Role Alignment", and "Clarity & Brevity". Each score 0-100, status ("strong" >= 78, "moderate" 55-77, "weak" < 55), and a sharp 1-sentence rationale grounded in actual resume observations.
4. matchedKeywords: 6-14 real skills/tools/domain keywords clearly evidenced in the resume, with short evidence quotes.
5. missingKeywords: 4-10 important keywords/competencies missing or underrepresented relative to the target JD (or industry standard for the candidate's target role), ranked by priority ("Critical", "Recommended", "Bonus") with practical advice on where/how to incorporate them truthfully.
6. bulletRewrites: Pick 4-5 weak or generic bullets verbatim from the resume, diagnose the exact issue, and provide a stronger rewritten version. Never fabricate metrics—use brackets like [X%] or [$Y] when a candidate needs to supply their own figure, or tighten phrasing using existing facts.
7. sectionAudit: Audit key sections ("Header & Contact", "Summary", "Work Experience", "Skills", "Education", "Projects / Certifications") with grade ("Strong", "Fair", "Needs Work", "Missing") and specific notes.
8. priorityChecklist: 5-6 ordered high-leverage actions to improve interview conversion.
9. extractedResumeText: Provide a clean plain-text transcription of the resume (if PDF was supplied, transcribe all text faithfully)."""

        parts.append({"text": prompt_text})

        parsed = call_gemini(
            parts=parts,
            system_instruction=(
                "You are an expert technical recruiter, hiring manager, and ATS specialist. "
                "Return strictly valid JSON matching the requested schema. Ground every finding "
                "in evidence from the candidate's actual resume."
            ),
            response_schema=ANALYSIS_RESPONSE_SCHEMA,
            thinking_level="LOW",
        )

        parsed["hasJobDescription"] = has_jd
        parsed["targetRole"] = (
            target_role
            or parsed.get("candidateSummary", {}).get("currentRole")
            or "General Audit"
        )
        self._send_json(200, parsed)

    def _handle_rewrite_bullet(self, body: dict[str, Any]) -> None:
        bullet = str(body.get("bullet") or "").strip()
        tone = str(body.get("tone") or "Quantified Impact").strip()
        target_role = str(body.get("targetRole") or "General").strip()
        job_description = str(body.get("jobDescription") or "").strip()

        if len(bullet) < 8:
            raise ValueError("Please enter a resume bullet point to rewrite.")

        jd_block = (
            f"Job Description excerpt:\n{job_description[:1500]}"
            if job_description
            else ""
        )
        prompt = (
            f'Original bullet: "{bullet}"\n'
            f"Requested style: {tone}\n"
            f"Target Role: {target_role}\n"
            f"{jd_block}\n\n"
            "Diagnose what makes the original bullet weak or average in 1 concise sentence, "
            "then provide 2 distinct rewritten alternatives in the requested style. Do not invent "
            "fake metrics; use [X%] or [N] placeholders only where the candidate should insert real numbers."
        )

        parsed = call_gemini(
            parts=[{"text": prompt}],
            system_instruction="You are an executive resume writer. Be crisp, concrete, and authentic.",
            response_schema=REWRITE_BULLET_SCHEMA,
            thinking_level="LOW",
        )
        self._send_json(200, parsed)

    def _handle_generate_pitch(self, body: dict[str, Any]) -> None:
        fmt = str(body.get("format") or "Cover Letter").strip()
        resume_text = str(body.get("resumeText") or "").strip()
        target_role = str(body.get("targetRole") or "Target Position").strip()
        job_description = str(body.get("jobDescription") or "").strip()

        if len(resume_text) < 30:
            raise ValueError("Resume text is required to draft tailored outreach.")

        jd_block = (
            f"Target Job Description:\n{job_description[:3000]}"
            if job_description
            else "No job description provided; tailor to the candidate's target role."
        )

        prompt = f"""Draft Format: {fmt}
Target Role: {target_role}

Candidate Resume:
{resume_text[:6000]}

{jd_block}

Instructions:
- If "Cover Letter": 3 tight, natural paragraphs highlighting concrete accomplishments from the resume, zero cliches.
- If "Recruiter Email": concise cold outreach email (~130 words) with clear value proposition and call to action.
- If "LinkedIn Note": crisp connection/InMail message under 280 characters or ~70 words that references specific experience.
- Ground every claim strictly in the resume provided."""

        parsed = call_gemini(
            parts=[{"text": prompt}],
            system_instruction=(
                "You are a strategic career advisor. Write human, high-signal outreach grounded "
                "strictly in the candidate's verified background."
            ),
            response_schema=OUTREACH_SCHEMA,
            thinking_level="LOW",
        )
        self._send_json(200, parsed)


def main() -> None:
    load_dotenv_file()
    server = ThreadingHTTPServer((BACKEND_HOST, BACKEND_PORT), ResumeAPIHandler)
    print(
        f"ResumeLens Python backend listening on http://{BACKEND_HOST}:{BACKEND_PORT}",
        flush=True,
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
