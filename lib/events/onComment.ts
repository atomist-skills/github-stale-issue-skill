/*
 * Copyright © 2020 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { EventHandler, subscription, status } from "@atomist/skill";
import { IssueConfiguration } from "../configuration";
import { unmarkIssue } from "../unmark";

export const handler: EventHandler<
	subscription.types.OnCommentSubscription,
	IssueConfiguration
> = async ctx => {
	const issue = ctx.data.Comment[0];
	const owner = issue?.pullRequest?.repo?.owner || issue?.issue?.repo?.owner;
	const apiUrl =
		issue?.pullRequest?.repo?.org?.provider?.apiUrl ||
		issue?.issue?.repo?.org?.provider?.apiUrl;
	const repo = issue?.pullRequest?.repo?.name || issue?.issue?.repo?.name;
	const issueNumber = issue?.pullRequest?.number || issue?.issue?.number;
	const labels = issue?.pullRequest?.labels || issue?.issue?.labels || [];
	if (issue.by.login === "atomist[bot]") {
		return status
			.success(
				`Not removing stale label from ${owner}/${repo}#${issueNumber} based on bot activity`,
			)
			.hidden();
	}
	return unmarkIssue(ctx, owner, repo, apiUrl, issueNumber, labels);
};
