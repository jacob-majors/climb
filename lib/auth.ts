import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from './prisma'

export async function getOrCreateDbUser(): Promise<string | null> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null

  const existing = await prisma.user.findUnique({ where: { clerkId } })
  if (existing) return existing.id

  const clerkUser = await currentUser()
  const name =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') ||
    clerkUser?.username ||
    'Athlete'

  const user = await prisma.user.upsert({
    where: { clerkId },
    create: { clerkId, name, age: 18 },
    update: {},
  })
  return user.id
}
