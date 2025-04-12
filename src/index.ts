import { setFailed } from "@actions/core";
import { context } from "@actions/github";
import { execSync } from "child_process";

export const run = async () => {
  const pullRequest = context.payload.pull_request;

  try {
    if (!pullRequest) {
      throw new Error("This action can only be run on Pull Requests.");
    }

    console.log("Hello World!");

    const fetchHead = process.env.FETCH_HEAD;
    const fetchHeadParent = process.env.FETCH_HEAD_PARENT;

    console.log(`FETCH_HEAD: ${fetchHead}`);
    console.log(`FETCH_HEAD_PARENT: ${fetchHeadParent}`);

    const diffOutput = execSync(`git diff ${fetchHeadParent} ${fetchHead}`, {
      encoding: "utf-8",
    });
    console.log("Git Diff Output:");
    console.log(diffOutput);
  } catch (error) {
    setFailed((error as Error)?.message ?? "Unknown error");
  }
};

if (!process.env.JESTWORKER_ID) {
  run();
}
