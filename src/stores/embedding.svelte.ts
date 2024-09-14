import { untrack } from "svelte";
import type { FOLD } from "rabbit-ear/types.js";
import { magnitude2, resize2, subtract2, scale2, add2 } from "rabbit-ear/math/vector.js";
import type { Shape } from "../general/shapes.ts";
import { connectedComponentsPairs } from "rabbit-ear/graph/connectedComponents.js";

const FPS = 60;

const Effectify = (func: () => void) =>
	$effect.root(() => {
		$effect(func);
		return () => {};
	});

class ForceSettings {
	active: boolean = $state(false);
	tween: number = $state(0.0);
}

class Embedding {
	settings: ForceSettings;

	#graph: FOLD = $state({});
	get graph() {
		return this.#graph;
	}
	set graph(graph: FOLD) {
		this.coords = (graph.vertices_coords || []).map(resize2);
		this.#graph = graph;
	}

	solverLoopID: number | undefined;

	coords: [number, number][] = $state([]);

	verticesVerticesLookup = $derived.by(() => {
		const result = (this.graph.vertices_vertices || []).map(() => ({}));
		(this.graph.vertices_vertices || []).forEach((verts, v0) =>
			verts.forEach((v1) => {
				result[v0][v1] = true;
				result[v1][v0] = true;
			}),
		);
		return result;
	});

	svgCircles: Shape[] = $derived(
		this.coords.map(([cx, cy]) => ({
			name: "circle",
			params: { cx, cy, r: 0.01 },
		})),
	);

	svgLines: Shape[] = $derived(
		(this.graph.edges_vertices || []).map(([v0, v1]) => {
			const [x1, y1] = this.coords[v0];
			const [x2, y2] = this.coords[v1];
			return { name: "line", params: { x1, y1, x2, y2 } };
		}),
	);

	dampen = 1.0;

	solverLoop() {
		let t = 0;
		untrack(() => {
			t = this.settings.tween;
		});

		// this.dampen *= 0.99;

		const goal = 100.0;
		const spring = 1.0;
		const repulsion = 2.0;
		const attract: [number, number][] = this.coords.map(() => [0, 0]);
		const repel: [number, number][] = this.coords.map(() => [0, 0]);

		// repel. all vertices vs. all vertices
		this.coords.forEach((u, i) =>
			this.coords.forEach((v, j) => {
				if (i === j) {
					return;
				}
				// repel force for u
				const vec = subtract2(u, v); // direction of force goes from v to u
				const mag = magnitude2(vec);
				// const goal = 1;
				// const fnrForce = scale2(vec, Math.pow(goal, 2) / mag);
				const eadesForce = scale2(vec, repulsion / Math.pow(mag, 2));
				const dampedForce: [number, number] = this.verticesVerticesLookup[i][j]
					? [0, 0]
					: scale2(eadesForce, this.dampen);
				repel[i] = add2(repel[i], dampedForce);
			}),
		);

		// attract: all vertices vs. their adjacent vertices
		this.coords.forEach((u, i) =>
			(this.graph.vertices_vertices?.[i] || []).forEach((j) => {
				const v: [number, number] = this.coords[j];
				// attract force for u
				const vec = subtract2(v, u); // direction of force goes from u to v
				const mag = magnitude2(vec);
				// const goal = 1;
				// const fnrForce = scale2(vec, Math.pow(mag, 2) / goal);
				const eadesForce = scale2(vec, (spring * Math.log(mag)) / goal);
				const dampedForce = scale2(eadesForce, this.dampen);
				attract[i] = add2(attract[i], dampedForce);
			}),
		);

		this.coords = this.coords.map((coord, i) => add2(add2(coord, attract[i]), repel[i]));
		// this.coords = this.coords.map((coord, i) => add2(coord, repel[i]));
		// console.log("attract", attract);
		// console.log("repel", repel);
	}

	manageSolverLoop() {
		if (this.settings.active && !this.solverLoopID) {
			this.dampen = 1.0;
			this.solverLoopID = setInterval(() => this.solverLoop(), 1000 / FPS);
		}
		if (!this.settings.active && this.solverLoopID) {
			clearInterval(this.solverLoopID);
			this.solverLoopID = undefined;
		}
	}

	constructor(settings: ForceSettings) {
		this.settings = settings;
		Effectify(() => this.manageSolverLoop());
	}
}

export const settings = new ForceSettings();
export const embedding = new Embedding(settings);
