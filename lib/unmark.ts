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
	HandlerStatus,
	repository,
	secret,
	status,
} from "@atomist/skill";
import { DefaultIssueConfiguration, IssueConfiguration } from "./configuration";

export async function unmarkIssue(
	ctx: EventContext<any, IssueConfiguration>,
	owner: string,
	repo: string,
	apiUrl: string,
	issue: number,
	labels: Array<{ name?: string }>,
): Promise<HandlerStatus> {
	const cfg = {
		...DefaultIssueConfiguration,
		...ctx.configuration?.[0]?.parameters,
	};
	const unmarkComment = cfg.unmarkComment;
	const staleLabel = cfg.staleLabel;

	if (!labels.some(l => l.name === staleLabel)) {
		return status
			.success(`Not removing stale label from ${owner}/${repo}#${issue}`)
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
			issue_number: issue,
			per_page: 250,
		})
	).data.reverse()[0];

	if (lastEvent.actor.type === "Bot") {
		return status
			.success(
				`Not removing stale label from ${owner}/${repo}#${issue} based on bot activity`,
			)
			.hidden();
	}

	if (unmarkComment) {
		await api.issues.createComment({
			owner,
			repo,
			issue_number: issue,
			body: unmarkComment,
		});
	}
	await api.issues.removeLabel({
		owner,
		repo,
		issue_number: issue,
		name: staleLabel,
	});

	return status.success(
		`Successfully removed stale label from ${owner}/${repo}#${issue}`,
	);
}
