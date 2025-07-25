# Contributing to KubeGuard

Thank you for your interest in contributing to KubeGuard! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues
- **Search existing issues** before creating a new one
- **Use issue templates** when available
- **Provide detailed information** including:
  - Environment details (OS, Node.js version, Python version)
  - Steps to reproduce the issue
  - Expected vs actual behavior
  - Screenshots or logs if applicable

### Suggesting Features
- **Check the roadmap** and existing feature requests
- **Describe the use case** and problem being solved
- **Provide examples** of how the feature would be used
- **Consider implementation complexity** and maintenance impact

## 🔧 Development Setup

### Prerequisites
- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **kubectl** configured with cluster access
- **rbac-tool** CLI installed
- **Git** for version control

### Local Development
1. **Fork and clone** the repository
2. **Set up backend** following [backend/README.md](./backend/README.md)
3. **Set up frontend** following [frontend/README.md](./frontend/README.md)
4. **Verify setup** by running both components

## 📝 Code Guidelines

### General Principles
- **Write clear, readable code** with meaningful names
- **Follow existing patterns** and conventions
- **Document your code** with comments and docstrings
- **Test your changes** thoroughly
- **Keep commits atomic** and well-described

### Backend (Python)
- **Follow PEP 8** style guidelines
- **Use type hints** for all function parameters and returns
- **Write docstrings** for all functions, classes, and modules
- **Use async/await** for I/O operations
- **Handle errors gracefully** with appropriate HTTP status codes

```python
async def analyze_rbac_bindings(namespace: Optional[str] = None) -> List[RbacBinding]:
    """
    Analyze RBAC bindings in the specified namespace.
    
    Args:
        namespace: Target namespace. If None, analyzes all namespaces.
        
    Returns:
        List of analyzed RBAC bindings with security metadata.
        
    Raises:
        RbacAnalysisError: If rbac-tool execution fails.
    """
```

### Frontend (TypeScript/React)
- **Use TypeScript strictly** with no `any` types
- **Follow React hooks patterns** for state management
- **Write JSDoc comments** for components and utilities
- **Use functional components** with hooks
- **Implement proper error boundaries**

```typescript
/**
 * Custom hook for managing RBAC graph visualization state.
 * 
 * @param bindings - Array of RBAC bindings to visualize
 * @returns Graph state and control functions
 */
export const useRbacGraph = (bindings: RbacBinding[]) => {
```

### Documentation
- **Use clear, concise language**
- **Include code examples** where helpful
- **Update README files** when adding features
- **Document breaking changes** in pull requests
- **Use consistent formatting** and structure

## 🚀 Pull Request Process

### Before Submitting
1. **Create a feature branch** from `main`
2. **Write/update tests** for your changes
3. **Update documentation** as needed
4. **Run linters and tests** locally
5. **Test with real Kubernetes cluster** if applicable

### PR Requirements
- **Descriptive title** summarizing the change
- **Detailed description** explaining:
  - What problem this solves
  - How it was implemented
  - Any breaking changes
  - Testing performed
- **Link related issues** using GitHub keywords
- **Add screenshots** for UI changes
- **Request appropriate reviewers**

### Review Process
- **Be responsive** to review feedback
- **Make requested changes** promptly
- **Explain decisions** when you disagree with feedback
- **Keep the PR scope focused** on a single feature/fix

## 🧪 Testing Guidelines

### Backend Testing
- **Unit tests** for service functions
- **Integration tests** for API endpoints
- **Mock external dependencies** (rbac-tool calls)
- **Test error conditions** and edge cases

```bash
# Run backend tests
cd backend
python -m pytest tests/ -v
```

### Frontend Testing
- **Component tests** for React components
- **Hook tests** for custom hooks
- **Integration tests** for user workflows
- **Visual regression tests** for graph components

```bash
# Run frontend tests
cd frontend/kube-guard-frontend
npm test
```

## 📋 Code Review Checklist

### For Authors
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] Performance impact considered
- [ ] Security implications reviewed

### For Reviewers
- [ ] Code is clear and maintainable
- [ ] Tests cover the changes
- [ ] Documentation is accurate
- [ ] No security vulnerabilities
- [ ] Performance is acceptable
- [ ] Follows project patterns

## 🎯 Areas for Contribution

### High Priority
- **Performance optimizations** for large clusters
- **Additional security checks** and findings
- **Export formats** (PDF, Excel, etc.)
- **Advanced filtering** capabilities
- **Mobile responsiveness** improvements

### Medium Priority
- **Internationalization** (i18n) support
- **Dark mode** theme
- **Keyboard navigation** accessibility
- **Automated testing** expansion
- **Documentation** improvements

### Low Priority
- **Plugin architecture** for custom analyzers
- **Multi-cluster** support
- **Historical data** tracking
- **Custom visualizations**
- **Advanced configuration** options

## 🏆 Recognition

Contributors will be recognized in:
- **README acknowledgments**
- **Release notes** for significant contributions
- **Contributor list** in documentation
- **Special thanks** in project communications

## 📧 Getting Help

### Development Questions
- **GitHub Discussions** for general questions
- **Issue comments** for specific problems
- **Draft PRs** for early feedback

### Communication
- **Be respectful** and inclusive
- **Ask questions** when uncertain
- **Share knowledge** with other contributors
- **Provide constructive feedback**

---

**Thank you for contributing to KubeGuard!** 🙏

Your contributions help make Kubernetes security analysis more accessible and effective for the entire community.
