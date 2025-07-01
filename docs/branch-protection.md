## 7. ブランチ保護ルール設定 (docs/branch-protection.md)

```markdown
# ブランチ保護ルール設定

## mainブランチ

Settings > Branches で以下のルールを設定：

- **Require a pull request before merging**: ✓
  - Require approvals: 1
  - Dismiss stale pull request approvals when new commits are pushed: ✓
  - Require review from CODEOWNERS: ✓
- **Require status checks to pass before merging**: ✓
  - Require branches to be up to date before merging: ✓
  - Status checks:
    - test
    - build
- **Require conversation resolution before merging**: ✓
- **Include administrators**: ✓

## developブランチ

- **Require a pull request before merging**: ✓
  - Require approvals: 1
- **Require status checks to pass before merging**: ✓
  - Status checks:
    - test
    - build