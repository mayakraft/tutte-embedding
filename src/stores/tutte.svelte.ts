import type { FOLD } from "rabbit-ear/types.js";
import { boundaries as Boundaries } from "rabbit-ear/graph/boundary.js";
import { invertFlatMap } from "rabbit-ear/graph/maps.js";
import qrSolve from "qr-solve";
import { embedding } from "./embedding.svelte.ts";

const computeTutte = (fold: FOLD) => {
	const graph = $state.snapshot(fold) as FOLD;
	if (!graph.vertices_coords) {
		return;
	}
	// graph.edges_faces = makeEdgesFaces(graph);
	// graph.faces_faces = makeFacesFaces(graph);
	// we can remove empty items, we don't need to match winding
	// const faces_faces = graph.faces_faces.map((faces) => faces.filter((a) => a != null));

	// get all boundary edges, use these to get the boundary faces
	const boundaries = Boundaries(graph);
	if (!boundaries.length) {
		throw new Error("no boundaries found");
	}
	if (boundaries.length > 1) {
		throw new Error("too many boundaries");
	}
	const [boundary] = boundaries;
	const { vertices: boundaryVertices, edges: boundaryEdges } = boundary;

	// const boundaryFaces = boundaryEdges
	// 	.map((e) => graph.edges_faces[e][0])
	// 	.filter((a) => a != null);

	const isBoundaryVertex = invertFlatMap(boundaryVertices).map(() => true);

	// the first row of boundary faces will be spread out evenly around the circle
	const coords: [number, number][] = [];
	boundaryVertices.forEach((vertex, i) => {
		const angle = (i / boundaryVertices.length) * Math.PI * 2;
		coords[vertex] = [Math.cos(angle), Math.sin(angle)];
	});

	const numVertices = graph.vertices_coords.length;
	const matrixRowCount = 2 * (numVertices - boundaryVertices.length);

	const a: [number, number, number][] = [];
	const b = Array.from(Array(matrixRowCount)).fill(0);

	// for every interior vertex, assign variable index backmap[vertexid]
	const backmap: number[] = [];
	let i = 0;
	Array.from(Array(numVertices))
		.map((_, vertex) => vertex)
		.filter((vertex) => !isBoundaryVertex[vertex])
		.forEach((vertex) => {
			backmap[vertex] = i++;
		});

	// fill matrix with values
	for (let vid = 0; vid < numVertices; vid++) {
		if (isBoundaryVertex[vid]) {
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
		const neighbors = graph.vertices_vertices[vid];

		neighbors
			.filter((nvid) => isBoundaryVertex[nvid])
			.forEach((nvid) => {
				b[2 * backmap[vid]] += (1.0 / neighbors.length) * coords[nvid][0];
				b[2 * backmap[vid] + 1] += (1.0 / neighbors.length) * coords[nvid][1];
			});

		neighbors
			.filter((nvid) => !isBoundaryVertex[nvid])
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

	// console.log(graph);
	// console.log(solution);
	// console.log("boundaryVertices", boundaryVertices);
	// console.log("isBoundaryVertex", isBoundaryVertex);
	// console.log("backmap", backmap);
	// console.log("a", a);
	// console.log("b", b);
	// console.log("coords", coords);

	// const circles = coords.map(([cx, cy]) => ({
	// 	name: "circle",
	// 	params: { cx, cy, r: 0.005 },
	// }));
	// const lines = connectedComponentsPairs(graph.vertices_vertices).map(([f0, f1]) => {
	// 	const [x1, y1] = coords[f0];
	// 	const [x2, y2] = coords[f1];
	// 	return { name: "line", params: { x1, y1, x2, y2 } };
	// });

	embedding.graph = {
		...graph,
		vertices_coords: coords,
	};
};

export const computeFlatState = (fold: FOLD) => {
	try {
		computeTutte(fold);
	} catch (err) {
		alert(err);
	}
};
