import { setFailed } from "@actions/core";
import { context } from "@actions/github";

const run = async () => {
  const pullRequest = context.payload.pull_request;

  try {
    if (!pullRequest) {
      throw new Error("This action can only be run on Pull Requests.");
    }

    console.log("Hello World!");

    const fetchHead = process.env.FETCH_HEAD;
    const fetchHeadParent = process.env.FETCH_HEAD_PARENT;

    console.log(`FETCH_HEAD: ${fetchHead}`);
    console.log(`FETCH_HEAD^: ${fetchHeadParent}`);
  } catch (error) {
    setFailed((error as Error)?.message ?? "Unknown error");
  }
};

run();
