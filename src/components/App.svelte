<script lang="ts">
	import { foldToViewBox } from "rabbit-ear/svg/general/viewBox.js";
	import DragAndDrop from "./DragAndDrop.svelte";
	import WebGLCanvas from "./WebGL/WebGLCanvas.svelte";
	import SVGTouchCanvas from "./SVG/SVGTouchCanvas.svelte";
	import SVGShapes from "./SVG/SVGShapes.svelte";
	import { fold } from "../stores/file.svelte.ts";
	import { computeFlatState } from "../stores/tutte.svelte.ts";
	import { embedding, settings } from "../stores/embedding.svelte.ts";
	import type { Shape } from "../general/shapes.ts";

	const viewBox = $derived.by(() => {
		return foldToViewBox({ vertices_coords: embedding.coords });
	});

	const vmax = $derived.by(() => {
		const box = viewBox.split(" ").map(parseFloat);
		return Math.max(box[2], box[3]);
	});

	const r = $derived(vmax * 0.005)

	const shapes: Shape[] = $derived(([] as Shape[])
		.concat(embedding.svgLines)
		.concat(embedding.svgCircles
			.map(({ name, params }) => ({ name, params: { ...params, r }}))));
</script>

<DragAndDrop />

<div class="container">
	<div class="row">
		<WebGLCanvas fold={fold.value} />
		<SVGTouchCanvas
			{viewBox}
			fill="white"
			stroke-width={vmax * 0.002}
			stroke="#158"
		>
			<SVGShapes {shapes} {vmax} />
		</SVGTouchCanvas>
	</div>

	<div class="float-bottom">
		<div class="form-container">
			<button disabled={fold.isEmpty} onclick={() => computeFlatState(fold.value)}>reset</button>
			<input type="checkbox" bind:checked={settings.active} id="force-active" />
			<label for="force-active">Forces</label>
			<input type="range" bind:value={settings.tween} min="0.0" max="1.0" step="0.01" />
		</div>
	</div>
</div>

<style>
	.container {
		position: relative;
		width: 100%;
		height: 100vh;
	}
	.row {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
	}
	:global(.row > *) {
		flex: 1;
		width: 50vw !important;
	}
	.float-bottom {
		width: 100%;
		position: absolute;
		bottom: 0px;
		z-index: 3;
		padding: 1rem;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		pointer-events: none;
	}
	.form-container {
		pointer-events: auto;
	}
</style>
