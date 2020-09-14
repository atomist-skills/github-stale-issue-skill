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

export interface IssueConfiguration {
	daysUntilStale: number;
	daysUntilClose: number;
	onlyLabels: string[];
	exemptLabels: string[];
	exemptProjects: boolean;
	exemptMilestones: boolean;
	exemptAssignees: boolean;
	staleLabel: string;
	markComment?: string;
	unmarkComment?: string;
	closeComment?: string;
	only?: "issues" | "pulls";
}

export const DefaultIssueConfiguration: IssueConfiguration = {
	daysUntilStale: 50,
	daysUntilClose: 7,
	onlyLabels: [],
	exemptLabels: ["pinned", "security"],
	exemptProjects: false,
	exemptMilestones: false,
	exemptAssignees: false,
	staleLabel: "wontfix",
};
