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
	EventHandler,
	handleError,
	repository,
	state,
	status,
	subscription,
} from "@atomist/skill";
import * as _ from "lodash";
import {
	DefaultIssueConfiguration,
	IssueConfiguration,
} from "../configuration";
import { processRepository } from "../mark";
import {
	RepositoriesQuery,
	RepositoriesQueryVariables,
} from "../typings/types";

export const handler: EventHandler<
	subscription.types.OnScheduleSubscription,
	IssueConfiguration
> = async ctx => {
	const cfg = {
		...DefaultIssueConfiguration,
		...ctx.configuration?.[0]?.parameters,
	};
	// Get all repos in this workspace
	const repos = await ctx.graphql.query<
		RepositoriesQuery,
		RepositoriesQueryVariables
	>("repositories.graphql");
	const repositoryState = await state.hydrate<{
		repositories: Record<string, { processed: number }>;
	}>(ctx.configuration?.[0]?.name, ctx, { repositories: {} });

	const filteredRepos = _.orderBy(
		repos.Repo.filter(r =>
			repository.matchesFilter(
				r.id,
				r.org.id,
				ctx.configuration?.[0]?.name,
				"repos",
				ctx,
			),
		).map(r => {
			const slug = `${r.owner}/${r.name}`;
			if (repositoryState?.repositories?.[slug]) {
				return {
					slug,
					repo: r,
					processed: repositoryState.repositories[slug].processed,
				};
			} else {
				return { slug, repo: r, processed: 0 };
			}
		}),
		["slug", "processed"],
		["asc", "asc"],
	);
	for (const repoEntry of filteredRepos.slice(0, 15)) {
		await handleError(async () =>
			processRepository(repoEntry.repo, cfg, ctx),
		);
		repositoryState.repositories[repoEntry.slug] = {
			processed: Date.now(),
		};
	}
	await state.save(repositoryState, ctx.configuration?.[0]?.name, ctx);

	return status.success(`Processed state issues and pull requests`);
};
