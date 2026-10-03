# Claude Code - Extended Skills & Instructions

## Your Custom Skills

| Skill | Invoke | Use When |
|-------|--------|----------|
| **debug-fix** | `/debug-fix` | Bugs, errors, performance issues, crashes |
| **orchestrated-dev-practice** | `/orchestrated-dev-practice` | New project, PRD, backlog, professional workflow |
| **google-style-reviewer** | `@google-style-reviewer` | Code review, Google Style compliance |

---

## Anthropic Official Skills

### 🎨 Creative & Design

| Skill | Use When |
|-------|----------|
| **algorithmic-art** | Generative art, creative coding, algorithmic designs |
| **canvas-design** | Visual design, layouts, design compositions |
| **frontend-design** | UI design guidance, distinctive visual design, avoiding templates |
| **theme-factory** | Design systems, visual themes, consistent styling |
| **slack-gif-creator** | Custom animated GIFs for team communications |

### 💻 Development & Technical

| Skill | Use When |
|-------|----------|
| **claude-api** | Claude API/SDK work, model IDs, pricing, tool use, MCP, caching |
| **mcp-builder** | Building MCP servers, extending Claude capabilities |
| **webapp-testing** | Testing web applications, automated QA workflows |
| **web-artifacts-builder** | Creating reusable web components, UI artifacts |
| **skill-creator** | Building custom skills, extending functionality |

### 🏢 Enterprise & Communication

| Skill | Use When |
|-------|----------|
| **brand-guidelines** | Applying company brand guidelines, ensuring consistency |
| **internal-comms** | Company announcements, internal docs, team communications |
| **doc-coauthoring** | Collaborative document creation, shared writing |

### 📄 Document Skills (Production)

| Skill | Use When | File Types |
|-------|----------|------------|
| **docx** | Word document creation/editing | .docx, .dotx |
| **pdf** | PDF operations: read, merge, split, forms, OCR | .pdf |
| **pptx** | PowerPoint presentations | .pptx, .potx |
| **xlsx** | Spreadsheet work, data analysis | .xlsx, .xlsm, .csv, .tsv |

### 🎓 Learning & Guidance

| Skill | Use When |
|-------|----------|
| **academy-guide** | Learning resources, "how do I", getting started questions |
| **discernment-nudge** | Encouraging critical thinking, information verification |

---

## Installation

### Quick Install (Recommended)

```bash
# Add Anthropic skills marketplace
/plugin marketplace add anthropics/skills

# Install document skills bundle
/plugin install document-skills@anthropic-agent-skills

# Install example skills bundle
/plugin install example-skills@anthropic-agent-skills
```

### Browse Available Plugins

```bash
# Open plugin browser
Browse and install plugins → anthropic-agent-skills → [choose bundle] → Install now
```

---

## Priority Recommendations

Based on your development workflow, consider installing:

### 🔥 High Priority
1. **claude-api** - Essential for API/SDK development
2. **mcp-builder** - Extend Claude Code capabilities
3. **webapp-testing** - Complements your debug-fix skill
4. **skill-creator** - Build custom workflow skills

### ⭐ Medium Priority
5. **docx** / **pdf** / **xlsx** - Document automation
6. **frontend-design** - UI development guidance
7. **doc-coauthoring** - Collaborative work
8. **web-artifacts-builder** - Reusable components

### 💡 Nice to Have
9. **academy-guide** - Learning resources for your team
10. **brand-guidelines** - If working with branding
11. **internal-comms** - Team communication templates

---

## Usage Examples

### Custom Skills
```bash
/debug-fix                    # Systematic debugging
/orchestrated-dev-practice    # Professional workflow
@google-style-reviewer        # Code review agent
```

### Anthropic Skills (After Installation)
```bash
# Development
/claude-api                   # API reference
/mcp-builder                  # Build MCP server
/webapp-testing               # Test web app

# Documents
/docx                         # Word documents
/pdf                          # PDF operations
/xlsx                         # Spreadsheets

# Design
/frontend-design              # UI design guidance
/canvas-design                # Visual layouts
```

---

## Skill Descriptions

### Your Custom Skills

#### /debug-fix
Systematic debugging framework:
- Bug analysis and root cause identification
- Performance profiling and optimization
- Memory leak detection
- Concurrency and race condition analysis
- Crash dump analysis and stack traces

#### /orchestrated-dev-practice
Professional development workflow:
- PRD (Product Requirements Document) creation
- Multi-agent orchestration and task delegation
- Backlog management and prioritization
- Conventional Commits (semantic versioning)
- ADR (Architecture Decision Records) documentation

#### @google-style-reviewer
Code review subagent following Google Style Guides:
- **TypeScript**: Google TypeScript Style Guide compliance
- **Python**: PEP 8 and Google Python conventions
- **Shell**: Bash/Shell scripting best practices
- **General**: Code quality, readability, maintainability

### Key Anthropic Skills

#### claude-api
Complete Claude API reference:
- Model IDs and pricing (Opus, Sonnet, Haiku, Fable)
- API parameters and configuration
- Streaming responses
- Tool use and function calling
- MCP integration
- Agent workflows
- Prompt caching and optimization
- Token counting
- Model migration guides

**Triggers:** Questions about Claude/Anthropic API, LLM integration, model selection

#### mcp-builder
Build custom MCP (Model Context Protocol) servers:
- Server scaffolding and setup
- Tool definitions
- Resource providers
- Protocol implementation
- Testing and debugging

#### frontend-design
Distinctive, intentional visual design guidance:
- Avoids generic templated defaults
- Aesthetic direction and typography
- Design system recommendations
- Intentional visual choices
- Modern UI patterns

#### docx (Production Skill)
Microsoft Word document operations:
- Create from scratch or templates
- Read and extract content
- Edit existing documents
- Insert/replace images
- Find and replace text
- Tracked changes and comments
- Convert to/from other formats

**Triggers:** Word doc, .docx, .dotx, Microsoft Word

#### pdf (Production Skill)
Comprehensive PDF operations:
- Read and extract text/tables
- Combine/merge multiple PDFs
- Split PDFs into separate files
- Rotate pages
- Add watermarks
- Fill PDF forms
- Encrypt/decrypt
- Extract images and attachments
- OCR on scanned PDFs

#### pptx (Production Skill)
PowerPoint presentation management:
- Create slide decks from scratch
- Read and parse existing presentations
- Edit and update slides
- Work with templates (.potx)
- Manage layouts and speaker notes
- Handle comments and annotations

**Triggers:** PowerPoint, .pptx, .potx, slide deck, presentation

#### xlsx (Production Skill)
Spreadsheet operations:
- Create and edit spreadsheets
- Read data from existing files
- Compute formulas and functions
- Format cells and styling
- Create charts and visualizations
- Clean and restructure messy data
- Handle .xlsx, .xlsm, .csv, .tsv formats

**Triggers:** Spreadsheet, Excel, .xlsx, .csv, tabular data

---

## Auto-Apply Rules

These rules are **always active** for every project in Claude Code:

1. **Code Quality**: Follow language-specific best practices
2. **Security**: Secure coding patterns by default
3. **Accessibility**: WCAG-compliant code generation
4. **Testing**: Write tests when adding features or fixing bugs
5. **Documentation**: Clear inline comments for complex logic

---

## Config Locations

### Your Custom Configuration
```
~/.cursorrules                              # Global code standards
~/.cursor/skills/debug-fix/                 # Debug skill
~/.cursor/skills/orchestrated-dev-practice/ # Project workflow skill
~/.cursor/agents/google-style-reviewer.md   # Code review agent
~/.cursor/rules/core-universal.mdc          # Universal rules
~/.cursor/rules/global-instructions.mdc     # AI instructions
```

### Claude Code Skills
```
~/.claude/skills/                           # Installed skills
~/.claude/CLAUDE.md                         # Global instructions
C:\Users\haqua\CLAUDE.md                    # Project-specific instructions
```

---

## Quick Reference

| User Says | AI Should Do |
|-----------|--------------|
| "I have a bug" | Offer `/debug-fix` |
| "Code is slow" | Offer `/debug-fix` |
| "Create project" | Offer `/orchestrated-dev-practice` |
| "Review code" | Offer `@google-style-reviewer` |
| "How do I use Claude API?" | Offer `/claude-api` |
| "Build MCP server" | Offer `/mcp-builder` |
| "Test this web app" | Offer `/webapp-testing` |
| "Create Word doc" | Offer `/docx` |
| "Extract PDF data" | Offer `/pdf` |
| "Make spreadsheet" | Offer `/xlsx` |
| "Design this UI" | Offer `/frontend-design` |

---

## Resources

- **Anthropic Skills Repo**: https://github.com/anthropics/skills
- **Skills Specification**: https://agentskills.io
- **Creating Custom Skills**: https://support.claude.com/en/articles/12512198
- **Claude Academy**: https://academy.claude.com
- **Using Skills in Claude**: https://support.claude.com/en/articles/12512180

---

## License

- **Your Custom Skills**: (Specify your license)
- **Most Anthropic Skills**: Apache 2.0 (Open Source)
- **Document Skills** (docx/pdf/pptx/xlsx): Source-available (Not Open Source)

See individual LICENSE.txt files in skill folders for complete terms.

---

*Last Updated: 2026-10-03*  
*Anthropic Skills Version: commit 8a1541c (Sep 29, 2026)*
