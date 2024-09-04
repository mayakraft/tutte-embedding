import { boundaries as Boundaries } from "rabbit-ear/graph/boundary.js";
import { makeEdgesFaces } from "rabbit-ear/graph/make/edgesFaces.js";
import { fold } from "./file.svelte.ts";
import type { Shape } from "../general/shapes.ts";

export const shapes = (() => {
	let value: Shape[] = $state([]);
	return {
		get value() {
			return value;
		},
		set value(v) {
			value = v;
		},
	};
})();

export const computeTutte = () => {
	const graph = $state.snapshot(fold.value);

	// boundary
	const boundaries = Boundaries(graph);
	if (!boundaries.length) {
		throw new Error("no boundaries found");
	}
	if (boundaries.length > 1) {
		throw new Error("too many boundaries");
	}
	const [boundary] = boundaries;
	const { edges } = boundary;

	// necessary adjacencies
	graph.edges_faces = makeEdgesFaces(graph);

	// draw diagram
	shapes.value = edges
		.map((_, i) => (i / edges.length) * Math.PI * 2)
		.map((a) => [Math.cos(a), Math.sin(a)])
		.map(([cx, cy]) => ({ name: "circle", params: { cx, cy, r: 0.02 } }));

	console.log("compute", graph, boundary);
};

export const computeFlatState = () => {
	try {
		computeTutte();
	} catch (err) {
		alert(err);
	}
};
