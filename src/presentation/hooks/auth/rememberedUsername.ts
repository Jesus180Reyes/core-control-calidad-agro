const REMEMBERED_USERNAME_KEY = 'login-usuario-recordado'

function storage(): Storage | null {
    if (typeof window === 'undefined') return null
    try {
        return window.localStorage
    } catch {
        return null
    }
}

export function readRememberedUsername(): string | null {
    try {
        return storage()?.getItem(REMEMBERED_USERNAME_KEY) || null
    } catch {
        return null
    }
}

export function saveRememberedUsername(username: string | null): void {
    try {
        const store = storage()
        if (!store) return
        if (username) {
            store.setItem(REMEMBERED_USERNAME_KEY, username)
        } else {
            store.removeItem(REMEMBERED_USERNAME_KEY)
        }
    } catch {
        return
    }
}
