<script lang="ts">
  /**
   * Helper component that must live inside <SvelteFlow>.
   * Exposes the screenToFlowPosition function via a bound prop.
   */
  import { useSvelteFlow } from '@xyflow/svelte';

  let { onReady }: { onReady: (fn: (pos: { x: number; y: number }) => { x: number; y: number }) => void } = $props();

  const { screenToFlowPosition } = useSvelteFlow();

  $effect(() => {
    onReady(screenToFlowPosition);
  });
</script>
