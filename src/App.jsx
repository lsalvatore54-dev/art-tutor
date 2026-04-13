import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard.jsx'
import NewProject from './components/NewProject.jsx'
import ProjectView from './components/ProjectView.jsx'
import RitaPresentation from './components/RitaPresentation.jsx'

const STORAGE_KEY = 'arttutor_projects'

function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch { return [] }
}

function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export default function App() {
  const [projects, setProjects] = useState(loadProjects)
  const [view, setView] = useState('dashboard') // dashboard | new | project | rita
  const [activeId, setActiveId] = useState(null)

  // Routing semplice via hash
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash
      if (hash === '#rita') setView('rita')
      else if (hash === '#new') setView('new')
      else if (hash.startsWith('#project/')) {
        const id = hash.replace('#project/', '')
        setActiveId(id)
        setView('project')
      } else {
        setView('dashboard')
      }
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  const navigate = (path) => {
    window.location.hash = path
  }

  const upsertProject = (project) => {
    setProjects(prev => {
      const exists = prev.find(p => p.id === project.id)
      const updated = exists
        ? prev.map(p => p.id === project.id ? project : p)
        : [project, ...prev]
      saveProjects(updated)
      return updated
    })
  }

  const deleteProject = (id) => {
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== id)
      saveProjects(updated)
      return updated
    })
    navigate('')
  }

  const activeProject = projects.find(p => p.id === activeId)

  if (view === 'rita') return <RitaPresentation onEnterApp={() => navigate('')} />

  if (view === 'new') return (
    <NewProject
      onBack={() => navigate('')}
      onSave={(project) => {
        upsertProject(project)
        navigate(`project/${project.id}`)
      }}
    />
  )

  if (view === 'project' && activeProject) return (
    <ProjectView
      project={activeProject}
      onBack={() => navigate('')}
      onUpdate={upsertProject}
      onDelete={deleteProject}
    />
  )

  return (
    <Dashboard
      projects={projects}
      onNew={() => navigate('new')}
      onOpen={(id) => navigate(`project/${id}`)}
      onRita={() => navigate('rita')}
    />
  )
}
