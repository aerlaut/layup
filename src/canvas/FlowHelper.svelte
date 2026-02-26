<script lang="ts">
  /**
   * Helper component that must live inside <SvelteFlow>.
   * Exposes the screenToFlowPosition function via a bound prop.
   */
  import { useSvelteFlow } from '@xyflow/svelte';

  let { onReady }: { onReady: (fns: {
    screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
    fitView: (options?: { duration?: number }) => void;
  }) => void } = $props();

  const { screenToFlowPosition, fitView } = useSvelteFlow();

  $effect(() => {
    onReady({ screenToFlowPosition, fitView });
  });
</script>
