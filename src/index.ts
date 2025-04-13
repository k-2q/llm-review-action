import { setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { Octokit } from "@octokit/rest";
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

    console.log("Diff: ", diffOutput);

    const changes = diffOutput.split("diff --git");

    if (!ghToken) {
      throw new Error("Token is required.");
    }
    const octokit = getOctokit(ghToken);
    const owner = repository?.owner;
    const repo = repository?.name;
    const pullNumber = pullRequest.number;

    if (!owner?.login || !repo) {
      throw new Error("Owner and repository not found.");
    }

    const commitId = execSync("git rev-parse HEAD").toString().trim();
    console.log("Current commit ID:", commitId);

    const octokitRest = new Octokit({
      auth: ghToken,
    });

    const response = await octokitRest.pulls.get({
      owner: owner.login,
      repo: repo,
      pull_number: pullNumber,
    });

    // Extract the head commit SHA from the response
    const headCommitSHA = response.data.head.sha;
    console.log("Head Commit SHA:", headCommitSHA);

    await octokit.request(
      `POST /repos/${owner}/${repo}/pulls/${pullNumber}/comments`,
      {
        owner: owner,
        repo: repo,
        pull_number: pullNumber,
        body: "Great stuff! This is a test comment.",
        commit_id: "9307a27621d47209b11ff8faaf7e3817026815ce",
        path: "test",
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
