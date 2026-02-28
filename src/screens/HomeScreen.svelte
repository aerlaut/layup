<script lang="ts">
  import { projectList, createProject, appState } from '../stores/appStore';
  import ProjectCard from './ProjectCard.svelte';

  $: account = $appState.account;

  function handleNewProject() {
    createProject();
  }
</script>

<div class="home-screen">
  <header class="home-header">
    <div class="home-header-left">
      <span class="home-logo">laverop</span>
    </div>
    <div class="home-header-right">
      <span class="home-account">{account.name}</span>
    </div>
  </header>

  <main class="home-body">
    <div class="home-content">
      <div class="home-title-row">
        <h1 class="home-title">Projects</h1>
        <button class="new-project-btn" on:click={handleNewProject}>
          + New Project
        </button>
      </div>

      {#if $projectList.length === 0}
        <div class="home-empty">
          <p class="empty-title">No projects yet</p>
          <p class="empty-desc">Create your first project to start diagramming.</p>
          <button class="new-project-btn" on:click={handleNewProject}>
            Create your first project
          </button>
        </div>
      {:else}
        <div class="project-list">
          {#each $projectList as project (project.id)}
            <ProjectCard {project} />
          {/each}
        </div>
      {/if}
    </div>
  </main>
</div>

<style>
  .home-screen {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: var(--color-bg);
  }

  .home-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    height: var(--toolbar-height);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    box-shadow: var(--shadow-sm);
    flex-shrink: 0;
  }

  .home-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .home-logo {
    font-weight: 800;
    font-size: 1rem;
    color: var(--color-primary);
    letter-spacing: -0.02em;
  }

  .home-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .home-account {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .home-body {
    flex: 1;
    overflow-y: auto;
    padding: 32px 24px;
  }

  .home-content {
    max-width: 960px;
    margin: 0 auto;
  }

  .home-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .home-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0;
  }

  .new-project-btn {
    background: var(--color-primary);
    color: white;
    border-color: transparent;
    font-weight: 600;
    padding: 8px 16px;
  }

  .new-project-btn:hover {
    background: var(--color-primary-hover);
    border-color: transparent;
  }

  .project-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .home-empty {
    text-align: center;
    padding: 64px 24px;
  }

  .empty-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 8px;
  }

  .empty-desc {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin-bottom: 24px;
  }
</style>
