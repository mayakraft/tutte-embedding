<script lang="ts">
	import DragAndDrop from "./DragAndDrop.svelte";
	import WebGLCanvas from "./WebGL/WebGLCanvas.svelte";
	import SVGTouchCanvas from "./SVG/SVGTouchCanvas.svelte";
	import SVGShapes from "./SVG/SVGShapes.svelte";
	import { fold } from "../stores/file.svelte.ts";
	import { shapes, computeFlatState } from "../stores/tutte.svelte.ts";
</script>

<DragAndDrop />

<div class="container">
	<div class="row">
		<WebGLCanvas fold={fold.value} />
		<SVGTouchCanvas
			viewBox="-1.1 -1.1 2.2 2.2"
			fill="white"
			stroke-width="0.002"
			stroke="white"
		>
			<SVGShapes shapes={shapes.value} />
		</SVGTouchCanvas>
	</div>

	<div class="float-bottom">
		<button disabled={fold.isEmpty} onclick={computeFlatState}>embed</button>
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
	.float-bottom {
		width: 100%;
		position: absolute;
		bottom: 0px;
		z-index: 3;
		padding: 1rem;
		display: flex;
		flex-direction: row;
		justify-content: center;
		pointer-events: none;
	}
	button {
		pointer-events: auto;
	}
</style>
