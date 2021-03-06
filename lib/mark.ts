/*
 * Copyright © 2021 Atomist, Inc.
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
	log,
	repository,
	secret,
	subscription,
} from "@atomist/skill";
import { Octokit } from "@octokit/rest";

import { IssueConfiguration } from "./configuration";
import { RepositoriesQuery } from "./typings/types";
import { replacePlaceholders } from "./util";

export async function processRepository(
	repo: RepositoriesQuery["Repo"][0],
	cfg: IssueConfiguration,
	ctx: EventContext<
		subscription.types.OnScheduleSubscription,
		IssueConfiguration
	>,
): Promise<void> {
	const credential = await ctx.credential.resolve(
		secret.gitHubAppToken({
			owner: repo.owner,
			repo: repo.name,
			apiUrl: repo.org.provider.apiUrl,
		}),
	);
	const api = github.api(
		repository.gitHub({ owner: repo.owner, repo: repo.name, credential }),
	);
	await ensureStaleLabelExists(repo, cfg, api);
	await markIssues(ctx, repo, cfg, api);
	await closeIssues(ctx, repo, cfg, api);
}

async function markIssues(
	ctx: EventContext<any, IssueConfiguration>,
	repo: RepositoriesQuery["Repo"][0],
	cfg: IssueConfiguration,
	api: Octokit,
): Promise<void> {
	const { owner, name } = repo;
	const onlyLabels = cfg.onlyLabels;
	const markComment = cfg.markComment;
	const staleLabel = cfg.staleLabel;
	const exemptLabels = cfg.exemptLabels || [];
	const exemptProjects = cfg.exemptProjects;
	const exemptMilestones = cfg.exemptMilestones;
	const exemptAssignees = cfg.exemptAssignees;
	const daysUntilClose = cfg.daysUntilClose;
	const daysUntilStale = cfg.daysUntilStale;
	const only = cfg.only;
	const labels = [staleLabel, ...exemptLabels];
	const queryParts = labels.map(label => `-label:"${label}"`);
	queryParts.push(...onlyLabels.map(label => `label:"${label}"`));
	queryParts.push(
		only === "issues" ? "is:issues" : only === "pulls" ? "is:pr" : "",
	);
	queryParts.push(exemptProjects ? "no:project" : "");
	queryParts.push(exemptMilestones ? "no:milestone" : "");
	queryParts.push(exemptAssignees ? "no:assignee" : "");

	let query = queryParts.join(" ");

	const timestamp = threshold(daysUntilStale)
		.toISOString()
		.replace(/\.\d{3}\w$/, "");

	query = `repo:${owner}/${name} is:open updated:<${timestamp} ${query}`;

	const params = {
		q: query,
		sort: "updated" as any,
		order: "desc" as any,
		per_page: 50,
	};

	const issues = (
		await api.search.issuesAndPullRequests(params)
	).data.items.filter(i => i.state !== "closed" && !(i as any).locked);
	log.debug(`Running GitHub issue query: ${query}`);
	if (issues.length === 0) {
		log.info(`No stale issues in ${owner}/${name}`);
	}
	for (const issue of issues) {
		log.info(`Marking issue ${owner}/${name}#${issue.number} as stale`);
		if (markComment) {
			await api.issues.createComment({
				owner,
				repo: name,
				issue_number: issue.number,
				body: `${replacePlaceholders(markComment, {
					type: issue.pull_request ? "pull request" : "issue",
					label: staleLabel,
					daysUntilStale,
					daysUntilClose,
				})}\n${github.formatMarkers(
					ctx,
					`${ctx.skill.namespace}-${ctx.skill.name}-type:stale`,
				)}`,
			});
		}
		await api.issues.addLabels({
			owner,
			repo: name,
			issue_number: issue.number,
			labels: [staleLabel],
		});
	}
}

async function closeIssues(
	ctx: EventContext<any, IssueConfiguration>,
	repo: RepositoriesQuery["Repo"][0],
	cfg: IssueConfiguration,
	api: Octokit,
): Promise<void> {
	const { owner, name } = repo;
	const staleLabel = cfg.staleLabel;
	const closeComment = cfg.closeComment;
	const only = cfg.only;
	const daysUntilStale = cfg.daysUntilStale;
	const daysUntilClose = cfg.daysUntilClose;

	let query = `label:"${staleLabel}" ${
		only === "issues" ? "is:issues" : only === "pulls" ? "is:pr" : ""
	}`;

	const days = cfg.daysUntilClose;
	if (days <= 0) {
		return;
	}

	const timestamp = threshold(days)
		.toISOString()
		.replace(/\.\d{3}\w$/, "");

	query = `repo:${owner}/${name} is:open updated:<${timestamp} ${query}`;

	const params = {
		q: query,
		sort: "updated" as any,
		order: "desc" as any,
		per_page: 50,
	};

	const issues = (
		await api.search.issuesAndPullRequests(params)
	).data.items.filter(i => i.state !== "closed" && !(i as any).locked);
	log.debug(`Running GitHub issue query: ${query}`);
	if (issues.length === 0) {
		log.info(`No issues to close in ${owner}/${name}`);
	}
	for (const issue of issues) {
		log.info(`Closing stale issue ${owner}/${name}#${issue.number}`);
		if (closeComment) {
			await api.issues.createComment({
				owner,
				repo: name,
				issue_number: issue.number,
				body: `${replacePlaceholders(closeComment, {
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
		await api.issues.update({
			owner,
			repo: name,
			issue_number: issue.number,
			state: "closed",
		});
	}
}

async function ensureStaleLabelExists(
	repo: RepositoriesQuery["Repo"][0],
	cfg: IssueConfiguration,
	api: Octokit,
): Promise<void> {
	const { owner, name } = repo;
	const staleLabel = cfg.staleLabel;

	try {
		await api.issues.getLabel({
			owner,
			repo: name,
			name: staleLabel,
		});
	} catch (e) {
		await api.issues.createLabel({
			owner,
			repo: name,
			name: staleLabel,
			color: "f9d0c4",
			description: "Mark issue or pull request as stale",
		});
	}
}

function threshold(days: number): Date {
	const ttl = days * 24 * 60 * 60 * 1000;
	return new Date(Date.now() - ttl);
}
