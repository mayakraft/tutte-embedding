<script lang="ts">
	import DragAndDrop from "./DragAndDrop.svelte";
	import WebGLCanvas from "./Viewer/WebGLCanvas.svelte";
	import { fold } from "../stores/file.svelte.ts";
</script>

<DragAndDrop />

<main>
	<WebGLCanvas fold={fold.value} />
</main>

<style>
	main {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
	}
</style>
