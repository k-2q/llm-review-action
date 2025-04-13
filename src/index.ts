import { setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { execSync } from "child_process";

export const run = async () => {
  const pullRequest = context.payload.pull_request;
  const repository = context.payload.repository;

  try {
    if (!pullRequest) {
      throw new Error("This action can only be run on Pull Requests.");
    }

    console.log("Hello World!");

    const ghToken = process.env.GITHUB_TOKEN;
    const fetchHead = process.env.FETCH_HEAD;
    const fetchHeadParent = process.env.FETCH_HEAD_PARENT;
    const diffOutput = execSync(`git diff ${fetchHeadParent} ${fetchHead}`, {
      encoding: "utf-8",
    });

    const changes = diffOutput.split("diff --git");

    if (!ghToken) {
      throw new Error("Token is required.");
    }
    const octokit = getOctokit(ghToken);
    const owner = "k-2q";
    const repo = repository?.name;
    const pullNumber = pullRequest.number;

    await octokit.request(
      `POST /repos/${owner}/${repo}/pulls/${pullNumber}/comments`,
      {
        owner: owner,
        repo: repo,
        pull_number: pullNumber,
        body: "Great stuff! This is a test comment.",
        commit_id: "090e897ebde4edc4df2e8097e83c769194154c66",
        path: "a/test",
        start_line: 1,
        start_side: "RIGHT",
        line: 1,
        side: "RIGHT",
        position: 1,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    changes.forEach((change) => {
      console.log(change);
    });
  } catch (error) {
    setFailed((error as Error)?.message ?? "Unknown error");
  }
};

if (!process.env.JESTWORKER_ID) {
  run();
}
