<script lang="ts">
	import { shapeToElement, type Shape } from "../../general/shapes.ts";

	type PropsType = {
		// shapes: SVGElement[],
		shapes: Shape[],
	};

	const {
		shapes,
		...rest
	}: PropsType = $props();

	let g: SVGGElement;

	const svgElements = $derived(shapes
		.map(shapeToElement)
		.filter(a => a !== undefined));

	const remove = (el: Element) => {
		while(el.children.length) { el.removeChild(el.children[0]); }
	};

	$effect(() => {
		remove(g);
		svgElements.forEach(el => g.appendChild(el));
	});
</script>

<g bind:this={g} {...rest} />
