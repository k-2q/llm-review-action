import { setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";
import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

interface ReviewResponse {
  suggestion: string;
  potentialIssue: string;
  lineStart: number;
  lineEnd: number;
}

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

    // console.log("Diff: ", diffOutput);

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

    // const commitId = execSync("git rev-parse HEAD").toString().trim();
    // console.log("Current commit ID:", commitId);

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

    const addComment = buildCommitRequest(
      octokit,
      owner.login,
      repo,
      pullNumber,
      headCommitSHA
    );

    for (const change of changes) {
      if (!change) continue;

      console.log("...................................");
      console.log(change);
      console.log("...................................");

      // Match the file name after b/
      const regex = /(?:^|\s)b\/(.+)/;
      const firstLine = change.split("\n")[0];
      const match = regex.exec(firstLine);

      if (!match) {
        throw new Error("Unable to parse file path.");
      }

      const filePath = match[1];

      console.log(filePath);

      // Gemini review
      const res = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          "You are an expert code reviewer!",
          "Review this 'git diff' code and provide any suggestion or potential issue in the code with the line numbers:",
          change,
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                suggestion: {
                  type: Type.STRING,
                  description: "Any suggestion for the line/block of code.",
                  nullable: true,
                },
                potentialIssue: {
                  type: Type.STRING,
                  description:
                    "Any potential issue for the line/block of code.",
                  nullable: true,
                },
                lineStart: {
                  type: Type.NUMBER,
                  description: "Start of the line/block of code.",
                  nullable: true,
                },
                lineEnd: {
                  type: Type.NUMBER,
                  description:
                    "End of the line/block of code, if the comment is for single line then same as lineStart.",
                  nullable: true,
                },
              },
            },
          },
        },
      });

      if (!res?.text) {
        return;
      }

      const responses: ReviewResponse[] = await JSON.parse(res.text);

      for (const response of responses) {
        console.log(response);
        const body = `${
          response.potentialIssue &&
          "**Potential Issue: ** \n" + response.potentialIssue + "\n"
        }
        ${response.suggestion && "**Suggestion: ** \n" + response.suggestion}`;
        addComment(filePath, response.lineStart, body);
      }
    }
  } catch (error) {
    setFailed((error as Error)?.message ?? "Unknown error");
  }
};

if (!process.env.JESTWORKER_ID) {
  run();
}

const buildCommitRequest = (
  octokit: any,
  owner: string,
  repo: string,
  pullNumber: number,
  commit: string
) => {
  return async (path: string, lineStart: number, body: string) => {
    await octokit.request(
      `POST /repos/${owner}/${repo}/pulls/${pullNumber}/comments`,
      {
        owner: owner,
        repo: repo,
        pull_number: pullNumber,
        body: body,
        commit_id: commit,
        path: path,
        line: lineStart,
        side: "RIGHT",
        position: 1,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
  };
};
