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
	Category,
	LineStyle,
	parameter,
	ParameterType,
	ParameterVisibility,
	resourceProvider,
	skill,
} from "@atomist/skill";
import { IssueConfiguration } from "./lib/configuration";

export const Skill = skill<IssueConfiguration & { repos: any; schedule: any }>({
	namespace: "atomist",
	displayName: "Auto-Close Stale Issues",
	author: "Atomist",
	categories: [Category.RepoManagement],
	license: "Apache-2.0",

	runtime: {
		memory: 1024,
		timeout: 540,
	},

	resourceProviders: {
		github: resourceProvider.gitHub({ minRequired: 1 }),
		slack: resourceProvider.chat({ minRequired: 0 }),
	},

	parameters: {
		staleLabel: {
			type: ParameterType.String,
			displayName: "Stale label",
			description: "Label to use when marking as stale",
			defaultValue: "wontfix",
			placeHolder: "wontfix",
			required: true,
		},
		daysUntilStale: {
			type: ParameterType.Int,
			displayName: "Days until stale",
			description:
				"Number of days of inactivity before an issue or pull request becomes stale",
			defaultValue: 60,
			required: false,
		},
		daysUntilClose: {
			type: ParameterType.Int,
			displayName: "Days until close",
			description:
				"Number of days of inactivity before an issue or pull request with the stale label is closed. Set to 0 to disable. If disabled, issues still need to be closed manually, but will remain marked as stale.",
			defaultValue: 7,
			required: false,
		},
		only: {
			type: ParameterType.SingleChoice,
			displayName: "Issue or pull requests",
			description: "Limit to only issues or pull requests",
			required: false,
			options: [
				{ value: "issues", text: "Issues" },
				{ value: "pulls", text: "Pull Requests" },
			],
		},
		markComment: {
			type: ParameterType.String,
			displayName: "Stale comment",
			description:
				"Comment to post when marking as stale. Leave empty to disable commenting. Optionally use $type (issue or pull request), $label (name of stale label), $daysUntilStale and $daysUntilClose in comment.",
			placeHolder:
				"Thanks for your contribution!\n\nThis $type has been automatically marked with $label because it has not had any activity in last $daysUntilStale days. It will be closed in $daysUntilClose days if no further activity occurs.",
			lineStyle: LineStyle.Multiple,
			required: false,
		},
		unmarkComment: {
			type: ParameterType.String,
			displayName: "Un-stale comment",
			description:
				"Comment to post when removing the stale label. Leave empty to disable commenting. Optionally use $type (issue or pull request), $label (name of stale label), $daysUntilStale and $daysUntilClose in comment.",
			lineStyle: LineStyle.Multiple,
			required: false,
		},
		closeComment: {
			type: ParameterType.String,
			displayName: "Close comment",
			description:
				"Comment to post when closing a stale issue or pull request. Leave empty to disable commenting. Optionally use $type (issue or pull request), $label (name of stale label), $daysUntilStale and $daysUntilClose in comment.",
			lineStyle: LineStyle.Multiple,
			required: false,
		},
		onlyLabels: {
			type: ParameterType.StringArray,
			displayName: "Required labels",
			description:
				"Only issues or pull requests with all of these labels are check if stale",
			required: false,
		},
		exemptLabels: {
			type: ParameterType.StringArray,
			displayName: "Exempt labels",
			description:
				"issues or pull requests with these labels will never be considered stale",
			required: false,
		},
		exemptAssignees: {
			type: ParameterType.Boolean,
			displayName: "Exempt assigned",
			description: "Ignore issues or pull requests with assignees",
			required: false,
		},
		exemptMilestones: {
			type: ParameterType.Boolean,
			displayName: "Exempt milestone",
			description: "Ignore issues or pull requests in a milestone",
			required: false,
		},
		exemptProjects: {
			type: ParameterType.Boolean,
			displayName: "Exempt projects",
			description: "Ignore issues or pull requests in projects",
			required: false,
		},
		repos: parameter.repoFilter({ required: false }),
		schedule: {
			type: ParameterType.Schedule,
			displayName: "Process issues and pull request",
			defaultValue: "0 */2 * * *",
			description:
				"Cron expression to process stale issues and pull requests",
			required: false,
			visibility: ParameterVisibility.Hidden,
		},
	},

	subscriptions: [
		"@atomist/skill/onSchedule",
		"@atomist/skill/github/onIssue",
		"@atomist/skill/github/onPullRequest",
		"@atomist/skill/github/onReview",
		"@atomist/skill/github/onComment",
	],
});
