import { mount } from 'svelte'
import App from './App.svelte'

const appElement = document.getElementById('app')
if (appElement === null) throw new Error("Couldn't find the element with the ID 'app")

const app = mount(App, {
  target: appElement
})

export default app
