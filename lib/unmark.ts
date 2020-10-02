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

import {
	EventContext,
	github,
	handleError,
	HandlerStatus,
	repository,
	secret,
	status,
} from "@atomist/skill";
import { DefaultIssueConfiguration, IssueConfiguration } from "./configuration";
import { replacePlaceholders } from "./util";

export async function unmarkIssue(
	ctx: EventContext<any, IssueConfiguration>,
	owner: string,
	repo: string,
	apiUrl: string,
	issueNumber: number,
	labels: Array<{ name?: string }>,
): Promise<HandlerStatus> {
	const cfg = {
		...DefaultIssueConfiguration,
		...ctx.configuration?.[0]?.parameters,
	};
	const unmarkComment = cfg.unmarkComment;
	const staleLabel = cfg.staleLabel;
	const daysUntilStale = cfg.daysUntilStale;
	const daysUntilClose = cfg.daysUntilClose;

	if (!labels.some(l => l.name === staleLabel)) {
		return status
			.success(
				`Not removing stale label from ${owner}/${repo}#${issueNumber}`,
			)
			.hidden();
	}

	const credential = await ctx.credential.resolve(
		secret.gitHubAppToken({
			owner,
			repo,
			apiUrl,
		}),
	);

	const api = github.api(repository.gitHub({ owner, repo, credential }));
	const lastEvent = (
		await api.issues.listEvents({
			owner,
			repo,
			issue_number: issueNumber,
			per_page: 250,
		})
	).data.reverse()[0];

	if (lastEvent.actor.type === "Bot") {
		return status
			.success(
				`Not removing stale label from ${owner}/${repo}#${issueNumber} based on bot activity`,
			)
			.hidden();
	}

	const issue = (
		await api.issues.get({
			owner,
			repo,
			issue_number: issueNumber,
		})
	).data;

	const comments = (
		await api.issues.listComments({
			owner,
			repo,
			issue_number: issueNumber,
			per_page: 100,
		})
	).data;
	const staleComment = comments.find(c =>
		c.body.includes(
			`[${ctx.skill.namespace}-${ctx.skill.name}-comment:stale]`,
		),
	);
	if (staleComment) {
		await handleError(async () =>
			api.issues.deleteComment({
				owner,
				repo,
				comment_id: staleComment.id,
			}),
		);
	}

	if (unmarkComment) {
		await api.issues.createComment({
			owner,
			repo,
			issue_number: issueNumber,
			body: `${replacePlaceholders(unmarkComment, {
				type: issue.pull_request ? "pull request" : "issue",
				label: staleLabel,
				daysUntilStale,
				daysUntilClose,
			})}\n${github.formatMarkers(
				ctx,
				`${ctx.skill.namespace}-${ctx.skill.name}-comment:close`,
			)}`,
		});
	}
	await handleError(async () =>
		api.issues.removeLabel({
			owner,
			repo,
			issue_number: issueNumber,
			name: staleLabel,
		}),
	);

	return status.success(
		`Successfully removed stale label from ${owner}/${repo}#${issue}`,
	);
}
