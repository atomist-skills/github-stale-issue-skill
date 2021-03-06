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

import { EventHandler, subscription } from "@atomist/skill";

import { IssueConfiguration } from "../configuration";
import { unmarkIssue } from "../unmark";

export const handler: EventHandler<
	subscription.types.OnReviewSubscription,
	IssueConfiguration
> = async ctx => {
	const review = ctx.data.Review[0];
	const owner = review?.pullRequest?.repo?.owner;
	const apiUrl = review?.pullRequest?.repo?.org?.provider?.apiUrl;
	const repo = review?.pullRequest?.repo?.name;
	const issueNumber = review?.pullRequest?.number;
	const labels = review?.pullRequest?.labels || [];
	return unmarkIssue(ctx, owner, repo, apiUrl, issueNumber, labels);
};
