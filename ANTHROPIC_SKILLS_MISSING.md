# Missing Anthropic Skills - Installation Guide

This document lists all available skills from the official [Anthropic Skills Repository](https://github.com/anthropics/skills) that are not currently in your CLAUDE.md configuration.

## Current Status

**Your Current Skills:**
- `/debug-fix` - Systematic debugging framework
- `/orchestrated-dev-practice` - Professional development workflow
- `@google-style-reviewer` - Code review subagent

**Missing from Anthropic Repository:** All 19 official Anthropic skills

---

## Available Anthropic Skills

### 🎨 Creative & Design Skills

#### 1. **algorithmic-art**
- **Purpose:** Create generative art and algorithmic designs
- **Use When:** Creating visual art through code, generative patterns, creative coding

#### 2. **canvas-design**
- **Purpose:** Design and create visual canvases
- **Use When:** Visual design work, creating layouts, design compositions

#### 3. **frontend-design**
- **Purpose:** Guide distinctive, intentional visual design for UI
- **Use When:** Building new UI, reshaping existing interfaces, aesthetic direction, typography
- **Features:** Helps avoid templated defaults

#### 4. **theme-factory**
- **Purpose:** Create and customize themes
- **Use When:** Building design systems, creating consistent visual themes

#### 5. **slack-gif-creator**
- **Purpose:** Create animated GIFs for Slack
- **Use When:** Creating custom animations for team communications

---

### 💻 Development & Technical Skills

#### 6. **claude-api**
- **Purpose:** Reference for Claude API / Anthropic SDK
- **Use When:** Working with model IDs, pricing, params, streaming, tool use, MCP, agents, caching
- **Trigger:** Questions about Claude/Anthropic API, LLM integration

#### 7. **mcp-builder**
- **Purpose:** Build MCP (Model Context Protocol) servers
- **Use When:** Creating custom MCP servers, extending Claude capabilities

#### 8. **webapp-testing**
- **Purpose:** Test web applications
- **Use When:** Testing web interfaces, automated testing, QA workflows

#### 9. **web-artifacts-builder**
- **Purpose:** Build web artifacts and components
- **Use When:** Creating reusable web components, building UI artifacts

#### 10. **skill-creator**
- **Purpose:** Create new custom skills
- **Use When:** Building your own skills, extending Claude capabilities

---

### 🏢 Enterprise & Communication Skills

#### 11. **brand-guidelines**
- **Purpose:** Apply company brand guidelines to content
- **Use When:** Creating branded content, ensuring brand consistency

#### 12. **internal-comms**
- **Purpose:** Create internal communications
- **Use When:** Writing company announcements, internal documentation, team communications

#### 13. **doc-coauthoring**
- **Purpose:** Collaborative document creation
- **Use When:** Working on shared documents, collaborative writing

---

### 📄 Document Skills (Production-Ready)

These are source-available skills that power Claude's document capabilities in production.

#### 14. **docx**
- **Purpose:** Create, read, edit Microsoft Word documents
- **Trigger:** Any mention of Word docs, .docx, .dotx files
- **Features:** Templates, tracked changes, comments, images

#### 15. **pdf**
- **Purpose:** Comprehensive PDF operations
- **Features:** 
  - Read and extract content
  - Merge and split PDFs
  - Form filling and OCR
  - Encryption/decryption

#### 16. **pptx**
- **Purpose:** Create and edit PowerPoint presentations
- **Trigger:** .pptx, .potx files, slide decks
- **Features:** Layouts, templates, speaker notes

#### 17. **xlsx**
- **Purpose:** Spreadsheet creation and manipulation
- **Trigger:** .xlsx, .xlsm, .csv, .tsv files
- **Features:** Formulas, charts, data cleaning

---

### 🎓 Learning & Guidance Skills

#### 18. **academy-guide**
- **Purpose:** Recommend Claude Academy courses and tutorials
- **Trigger:** "how do I", "getting started", learning requests
- **Features:** Links to academy.claude.com resources

#### 19. **discernment-nudge**
- **Purpose:** Encourage critical thinking and verification
- **Use When:** Users need to verify information or think critically

---

## Installation Instructions

### Option 1: Install via Claude Code Plugin Marketplace

```bash
# Add the Anthropic skills marketplace
/plugin marketplace add anthropics/skills

# Install document skills
/plugin install document-skills@anthropic-agent-skills

# Install example skills
/plugin install example-skills@anthropic-agent-skills
```

### Option 2: Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/anthropics/skills.git
```

2. Copy desired skills to your `.claude/skills/` directory
3. Each skill folder contains a `SKILL.md` file with instructions

### Option 3: Use in Claude.ai

All these skills are already available in Claude.ai for paid plans. Just upload or reference them in your conversations.

---

## Recommended Skills to Add

Based on your current setup focused on development workflows, consider adding:

### High Priority:
1. **claude-api** - Essential for API/SDK work
2. **mcp-builder** - Extend Claude capabilities
3. **webapp-testing** - Complement your debug-fix skill
4. **skill-creator** - Build custom skills for your workflow

### Medium Priority:
5. **docx/pdf/xlsx** - Document automation
6. **frontend-design** - UI development guidance
7. **doc-coauthoring** - Collaborative work

### Nice to Have:
8. **academy-guide** - Learning resources
9. **brand-guidelines** - If working with branding
10. **internal-comms** - Team communication

---

## Integration with Your CLAUDE.md

To add these skills to your global configuration, you can either:

1. **Keep separate** - Install via plugin system (recommended)
2. **Document in CLAUDE.md** - Add a skills reference section
3. **Create skill index** - Maintain a local skill registry

---

## Skill vs Subagent

**Skills** (invoke with `/skill-name`):
- Dynamic instructions loaded on demand
- Self-contained in folders
- Can include scripts and resources

**Subagents** (invoke with `@agent-name`):
- Separate agent instances
- Can run in background
- Have their own context

---

## Additional Resources

- **Repository:** https://github.com/anthropics/skills
- **Specification:** https://agentskills.io
- **Documentation:** https://support.claude.com/en/articles/12512198-creating-custom-skills
- **Claude Academy:** https://academy.claude.com

---

## License Information

- Most skills: Apache 2.0 (open source)
- Document skills (docx/pdf/pptx/xlsx): Source-available (not open source)
- See individual LICENSE.txt files in each skill folder

---

*Last Updated: 2026-10-03*
*Based on: anthropics/skills repository (commit 8a1541c, Sep 29, 2026)*
