import { Redirect } from 'expo-router'

// Immediately redirect to the motivation page on launch.
// Using <Redirect> (not router.replace in a useEffect) because the navigator
// must be mounted before imperative navigation calls can be made safely.
export default function Index() {
  return <Redirect href="/motivation" />
}
