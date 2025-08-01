# Contributing to MISMO Expert MCP

Thank you for your interest in contributing to the MISMO Expert MCP tool! This project helps developers work with the MISMO V3.6 mortgage and appraisal data standards.

## How to Contribute

### Reporting Issues

1. Check if the issue already exists
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Your environment details

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Add tests if applicable
5. Ensure all tests pass
6. Commit with clear messages
7. Push to your fork
8. Submit a pull request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/mismo-expert.git
cd mismo-expert

# Install dependencies
npm install

# Build and run with Docker
docker-compose up -d

# Run tests (from main branch)
npm test
```

### Code Style

- Use 2 spaces for indentation
- Follow existing code patterns
- Add JSDoc comments for new functions
- Keep functions focused and small

### Areas for Contribution

- **New Query Types**: Add more query capabilities in `src/query-engine.js`
- **Better Parsing**: Improve narrative text parsing in `src/migrations.js`
- **Field Mappings**: Add more legacy-to-V3.6 field mappings
- **Documentation**: Improve examples and use cases
- **Tests**: Add test coverage for edge cases

### Testing

Before submitting:
1. Test your changes locally
2. Ensure Docker container builds
3. Verify MCP server responds correctly
4. Check that Claude Code integration works

### Questions?

Feel free to open an issue for discussion before making large changes.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help make this tool better for everyone

Thank you for contributing!