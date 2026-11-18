export function buildMarkdownReport(result) {
  const lines = [];
  lines.push(`# ResumeLens Audit — ${result.candidateSummary.name}`);
  lines.push(
    `**Target Role:** ${result.targetRole} · **Overall Score:** ${result.overallScore}/100 (${result.verdict})`
  );
  lines.push(
    `**Profile:** ${result.candidateSummary.currentRole} · ${result.candidateSummary.experienceYears} · ${result.candidateSummary.primaryDomain}`
  );
  lines.push('');
  lines.push('## Executive Summary');
  lines.push(result.executiveSummary);
  lines.push('');
  lines.push('## Dimension Breakdown');
  for (const dim of result.dimensionScores) {
    lines.push(`- **${dim.name}:** ${dim.score}/100 (${dim.status}) — ${dim.rationale}`);
  }
  lines.push('');
  lines.push('## Matched Keywords');
  for (const kw of result.matchedKeywords) {
    lines.push(`- **${kw.term}** (${kw.category}): ${kw.evidence}`);
  }
  lines.push('');
  lines.push('## Missing / Recommended Keywords');
  for (const kw of result.missingKeywords) {
    lines.push(`- **${kw.term}** [${kw.priority}]: ${kw.suggestion}`);
  }
  lines.push('');
  lines.push('## Bullet Point Rewrites');
  for (const b of result.bulletRewrites) {
    lines.push(`### ${b.section}`);
    lines.push(`- **Original:** ${b.original}`);
    lines.push(`- **Issue:** ${b.issue}`);
    lines.push(`- **Improved:** ${b.improved}`);
    lines.push('');
  }
  lines.push('## Priority Action Checklist');
  for (const item of result.priorityChecklist) {
    lines.push(`- [ ] [${item.impact}] ${item.action} (${item.expectedLift})`);
  }
  return lines.join('\n');
}
