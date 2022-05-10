module.exports = {
  branches: "master",
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "angular",
        releaseRules: [
          {
            type: "docs",
            release: "patch",
          },
          {
            type: "feat",
            release: "minor",
          },
          {
            type: "fix",
            release: "patch",
          },
        ],
        parserOpts: {
          noteKeywords: ["BREAKING CHANGE", "BREAKING CHANGES"],
        },
      },
    ],
  ],
  verifyConditions: ["@semantic-release/git"],
  prepare: ["@semantic-release/git"],
  publish: ["@semantic-release/github"],
};
