# Contributing to Spanner MCP Server

Thank you for your interest in contributing to the Spanner MCP Server! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- Google Cloud Project with Spanner instance (for testing)

### Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/spanner-mcp-server.git
   cd spanner-mcp-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Install git hooks:**
   ```bash
   npm run prepare
   ```

## 🧪 Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Check code formatting
npm run format:check

# Format code
npm run format
```

### Building

```bash
# Build the project
npm run build

# Start development server
npm run dev
```

## 📝 Code Style

### TypeScript

- Use TypeScript for all new code
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Follow ESLint and Prettier configurations

### Security

- **NEVER** allow data modification operations
- Always validate user input
- Use parameterized queries
- Log security events
- Follow the principle of least privilege

### Error Handling

- Use try-catch blocks appropriately
- Provide meaningful error messages
- Log errors with context
- Handle edge cases gracefully

## 🔒 Security Guidelines

### Critical Rules

1. **READ-ONLY ONLY**: This system is designed for read-only operations
2. **No Data Modification**: Never allow INSERT, UPDATE, DELETE, etc.
3. **Input Validation**: Always validate and sanitize user input
4. **SQL Injection Prevention**: Use parameterized queries
5. **Audit Logging**: Log all operations for security monitoring

### Security Checklist

- [ ] No modification keywords in queries
- [ ] Input validation implemented
- [ ] SQL injection protection in place
- [ ] Error messages don't leak sensitive information
- [ ] Security events are logged
- [ ] Tests cover security scenarios

## 🧪 Testing Guidelines

### Unit Tests

- Write tests for all new functionality
- Mock external dependencies
- Test both success and failure cases
- Aim for >80% code coverage

### Integration Tests

- Test MCP server integration
- Test Spanner client operations
- Test security validations
- Test error handling

### Test Structure

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle success case', async () => {
      // Test implementation
    });

    it('should handle error case', async () => {
      // Test implementation
    });
  });
});
```

## 📋 Pull Request Process

### Before Submitting

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Follow the coding standards
   - Add tests for new functionality
   - Update documentation if needed

3. **Run quality checks:**
   ```bash
   npm run lint
   npm run format:check
   npm test
   npm run build
   ```

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

### Pull Request Guidelines

1. **Title**: Use conventional commit format
2. **Description**: Explain what and why, not how
3. **Tests**: Ensure all tests pass
4. **Documentation**: Update docs if needed
5. **Security**: Verify no security issues introduced

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

## 🐛 Bug Reports

### Before Reporting

1. Check existing issues
2. Try to reproduce the issue
3. Check the logs for errors
4. Verify your configuration

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
A clear description of what you expected to happen.

**Environment:**
- OS: [e.g. Ubuntu 20.04]
- Node.js version: [e.g. 18.17.0]
- Spanner MCP Server version: [e.g. 1.0.0]

**Additional context**
Add any other context about the problem here.
```

## 💡 Feature Requests

### Before Requesting

1. Check if the feature already exists
2. Consider if it aligns with project goals
3. Think about security implications
4. Consider implementation complexity

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
A clear description of any alternative solutions.

**Additional context**
Add any other context or screenshots about the feature request.
```

## 📚 Documentation

### Documentation Standards

- Use clear, concise language
- Include code examples
- Keep documentation up to date
- Use proper markdown formatting

### Documentation Types

- **README.md**: Project overview and quick start
- **API Documentation**: Tool descriptions and examples
- **Security Documentation**: Security features and guidelines
- **Deployment Guide**: Production deployment instructions

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Follow project conventions

### Communication

- Use GitHub issues for discussions
- Be clear and specific in communications
- Respond to feedback promptly
- Ask questions when unsure

## 🏆 Recognition

Contributors will be recognized in:
- Project README
- Release notes
- Contributor hall of fame

## 📞 Getting Help

- Check the documentation
- Search existing issues
- Create a new issue for bugs
- Ask questions in discussions

Thank you for contributing to Spanner MCP Server! 🚀 