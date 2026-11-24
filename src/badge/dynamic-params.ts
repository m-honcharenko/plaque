import { BadRequestException } from "@nestjs/common"

import type { ValueQuery } from "../core/ports/value-provider.port.js"
import { githubQuery, npmQuery } from "../core/values/query.js"

// The query of a request path. Anything that is not a plain GitHub or npm
// name is a 400, before any upstream is asked.
export function githubQueryOr400(
	owner: string,
	repo: string,
	metric: string
): ValueQuery {
	const query = githubQuery(owner, repo, metric)
	if (query === null) throw new BadRequestException("Invalid repository")
	return query
}

// A scoped name arrives as two segments (/npm/@scope/name/version) or as one
// with the slash escaped (/npm/@scope%2Fname/version).
export function npmQueryOr400(name: string, scopedName?: string): ValueQuery {
	const query = npmQuery(
		scopedName === undefined ? name : `${name}/${scopedName}`
	)
	if (query === null) throw new BadRequestException("Invalid package name")
	return query
}
