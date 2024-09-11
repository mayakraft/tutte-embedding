import type { FOLD } from "rabbit-ear/types.js";
import { boundaries as Boundaries } from "rabbit-ear/graph/boundary.js";
import { connectedComponentsPairs } from "rabbit-ear/graph/connectedComponents.js";
import { makeEdgesFaces } from "rabbit-ear/graph/make/edgesFaces.js";
import { makeFacesFaces } from "rabbit-ear/graph/make/facesFaces.js";
import { invertFlatMap } from "rabbit-ear/graph/maps.js";
import { add2, normalize2 } from "rabbit-ear/math/vector.js";
import qrSolve from "qr-solve";
import { fold } from "./file.svelte.ts";
import type { Shape } from "../general/shapes.ts";

const averageAngles = (angles: number[]) => {
	const vectorSum = angles
		.map((a) => [Math.cos(a), Math.sin(a)] as [number, number])
		.reduce((a, b) => add2(a, b), [0, 0]);
	const vector = normalize2(vectorSum);
	return Math.atan2(vector[1], vector[0]);
};

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

const walkFaces = (
	faces_faces: (number | null | undefined)[][],
	row: number[],
	visited: { [key: number]: boolean },
) => {
	const nextRowWithDuplicates = row.flatMap((face) =>
		faces_faces[face].filter((a) => a != null).filter((f) => !visited[f]),
	);
	const nextRow = Array.from(new Set(nextRowWithDuplicates));
	nextRow.forEach((f) => {
		visited[f] = true;
	});
	return nextRow;
};

const bfTree = (faces_faces: (number | null | undefined)[][], firstRow: number[]) => {
	const visited: { [key: number]: boolean } = {};
	const tree = [firstRow];
	firstRow.forEach((f) => (visited[f] = true));
	let prevRow = firstRow;
	let nextRow;
	do {
		nextRow = walkFaces(faces_faces, prevRow, visited);
		if (!nextRow.length) {
			return tree;
		}
		tree.push(nextRow);
		prevRow = nextRow;
	} while (true);
};

type EmbeddedFace = {
	face: number; // this face's index
	// faces: number[]; // adjacent faces
	angle: number;
	radius: number;
	// coords: [number, number];
};

export const computeTutte = () => {
	const graph = $state.snapshot(fold.value) as FOLD;
	if (!graph.faces_vertices) {
		return;
	}
	graph.edges_faces = makeEdgesFaces(graph);
	graph.faces_faces = makeFacesFaces(graph);
	// we can remove empty items, we don't need to match winding
	const faces_faces = graph.faces_faces.map((faces) => faces.filter((a) => a != null));

	// get all boundary edges, use these to get the boundary faces
	const boundaries = Boundaries(graph);
	if (!boundaries.length) {
		throw new Error("no boundaries found");
	}
	if (boundaries.length > 1) {
		throw new Error("too many boundaries");
	}
	const [boundary] = boundaries;
	const { edges: boundaryEdges } = boundary;

	const boundaryFaces = boundaryEdges
		.map((e) => graph.edges_faces[e][0])
		.filter((a) => a != null);

	const isBoundaryFace = invertFlatMap(boundaryFaces).map(() => true);

	// the first row of boundary faces will be spread out evenly around the circle
	const coords: [number, number][] = [];
	boundaryFaces.forEach((face, i) => {
		const angle = (i / boundaryFaces.length) * Math.PI * 2;
		coords[face] = [Math.cos(angle), Math.sin(angle)];
	});

	const numFaces = graph.faces_vertices.length;
	const matrixRowCount = 2 * (numFaces - boundaryFaces.length);

	const a: [number, number, number][] = [];
	const b = Array.from(Array(matrixRowCount)).fill(0);

	// for every interior vertex, assign variable index backmap[vertexid]
	const backmap: number[] = [];
	let i = 0;
	Array.from(Array(numFaces))
		.map((_, face) => face)
		.filter((face) => !isBoundaryFace[face])
		.forEach((face) => {
			backmap[face] = i++;
		});

	// fill matrix with values
	for (let vid = 0; vid < numFaces; vid++) {
		if (isBoundaryFace[vid]) {
			continue;
		}
		// index of variable corresponding to x coordinate is 2 * backmap[vid]
		// index of variable corresponding to y coordinate is 2 * backmap[vid] + 1
		a.push([2 * backmap[vid], 2 * backmap[vid], 1.0]);
		a.push([2 * backmap[vid] + 1, 2 * backmap[vid] + 1, 1.0]);

		// n nonboundary neighbours
		// m boundary neighbours
		// x = (... n2_x, n2_y ....  p_x, p_y,..... n1_x, n1_y ... )
		// a * x = b
		//  (p_x, p_y) - 1/n( (n1_x, n1_y) + .... + (nk_x, nk_y)) = 1/n *((m1_x, m1_y) +... + (ml_x,ml_y))

		// each row corresponds to an equation. row 1 is equation 1
		// iterate over all neighbours
		const neighbors = faces_faces[vid];

		neighbors
			.filter((nvid) => isBoundaryFace[nvid])
			.forEach((nvid) => {
				b[2 * backmap[vid]] += (1.0 / neighbors.length) * coords[nvid][0];
				b[2 * backmap[vid] + 1] += (1.0 / neighbors.length) * coords[nvid][1];
			});

		neighbors
			.filter((nvid) => !isBoundaryFace[nvid])
			.forEach((nvid) => {
				a.push([2 * backmap[vid], 2 * backmap[nvid], -1.0 / neighbors.length]);
				a.push([2 * backmap[vid] + 1, 2 * backmap[nvid] + 1, -1.0 / neighbors.length]);
			});
	}

	a.sort((row, col) => (row[0] === col[0] ? row[1] - col[1] : row[0] - col[0]));

	// solve a*x = b
	const solve = qrSolve.prepare(a, matrixRowCount, matrixRowCount);
	const solution = new Float64Array(matrixRowCount);
	solve(b, solution);

	backmap.forEach((i, beforeIndex) => {
		coords[beforeIndex] = [solution[i * 2], solution[i * 2 + 1]];
	});

	console.log(solution);
	console.log("boundaryFaces", boundaryFaces);
	console.log("isBoundaryFace", isBoundaryFace);
	console.log("backmap", backmap);
	console.log("a", a);
	console.log("b", b);
	console.log("coords", coords);

	const circles = coords.map(([cx, cy]) => ({
		name: "circle",
		params: { cx, cy, r: 0.005 },
	}));
	const lines = connectedComponentsPairs(faces_faces).map(([f0, f1]) => {
		const [x1, y1] = coords[f0];
		const [x2, y2] = coords[f1];
		return { name: "line", params: { x1, y1, x2, y2 } };
	});

	shapes.value = [];
	shapes.value.push(...lines);
	shapes.value.push(...circles);
};

export const computeFlatState = () => {
	try {
		computeTutte();
	} catch (err) {
		alert(err);
	}
};
