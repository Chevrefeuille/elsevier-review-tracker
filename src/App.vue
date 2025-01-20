<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type {
  ReviewData,
  RevisionMap,
  ReviewerMap,
  ReviewerData,
  RevisionData,
  FormattedReviewData,
} from '@/types/review'

const getReadableDate = (timestamp: number) => {
  const date = new Date(timestamp * 1000) // Convert seconds to milliseconds
  const dateDay = date.toISOString().split('T')[0]
  const dateHour = date.toTimeString().split(' ')[0]
  // remove the seconds from the time
  const dateHourWithoutSeconds = dateHour.split(':').slice(0, 2).join(':')
  return `${dateDay} at ${dateHourWithoutSeconds}`
}

const uuid = ref('')
const reviewData = ref<FormattedReviewData | null>(null)
const isLoading = ref(false)
const error = ref('')

const route = useRoute()
const router = useRouter()

onMounted(async () => {
  await router.isReady()
  const uuidParam = route.query.uuid as string
  if (uuidParam) {
    uuid.value = uuidParam
    fetchReviewData()
  }
})

// Group and sort the review events
const formatReviewData = (reviewData: ReviewData) => {
  if (!reviewData) return null

  const groupedEvents: RevisionMap = {}

  reviewData.ReviewEvents.forEach((event) => {
    const revision = event.Revision
    const reviewerId = event.Id

    if (!groupedEvents[revision]) groupedEvents[revision] = {} as ReviewerMap

    if (!groupedEvents[revision][reviewerId]) {
      groupedEvents[revision][reviewerId] = {
        Id: reviewerId,
        InvitedDate: 0,
        AcceptedDate: 0,
        CompletedDate: 0,
        LastUpdated: 0,
        Collapsed: true,
      }
    }

    const reviewer = groupedEvents[revision][reviewerId]

    if (event.Event === 'REVIEWER_INVITED') reviewer.InvitedDate = event.Date
    if (event.Event === 'REVIEWER_ACCEPTED') reviewer.AcceptedDate = event.Date
    if (event.Event === 'REVIEWER_COMPLETED') reviewer.CompletedDate = event.Date

    if (event.Date > reviewer.LastUpdated) reviewer.LastUpdated = event.Date
  })

  const revisions = Object.entries(groupedEvents)
    .sort(([revA], [revB]) => Number(revA) - Number(revB))
    .map(
      ([revisionId, reviewerMap]) =>
        ({
          Id: Number(revisionId),
          Reviewers: Object.values(reviewerMap).sort((a, b) => a.LastUpdated - b.LastUpdated),
          Collapsed: true,
        }) as RevisionData,
    )

  const formattedReviewData = {
    CorrespondingAuthor: reviewData.CorrespondingAuthor,
    JournalAcronym: reviewData.JournalAcronym,
    JournalName: reviewData.JournalName,
    LastUpdated: reviewData.LastUpdated,
    ManuscriptTitle: reviewData.ManuscriptTitle,
    SubmissionDate: reviewData.SubmissionDate,
    Revisions: revisions,
  }

  return formattedReviewData
}

const fetchReviewData = async () => {
  if (!uuid.value) {
    alert('Please enter a UUID')
    return
  }
  error.value = ''
  reviewData.value = null

  isLoading.value = true
  try {
    const response = await fetch(
      `https://tnlkuelk67.execute-api.us-east-1.amazonaws.com/tracker/${uuid.value}`,
    )
    if (!response.ok) throw new Error('Failed to fetch data')
    const data = await response.json()
    reviewData.value = formatReviewData(data)
  } catch (e) {
    if (e instanceof Error) {
      error.value = e.message
    } else {
      error.value = 'An error occurred'
    }
  } finally {
    isLoading.value = false
  }
}

const getStatus = (reviewer: ReviewerData) => {
  if (reviewer.CompletedDate) return 'Completed'
  if (reviewer.AcceptedDate) return 'Accepted'
  if (reviewer.InvitedDate) return 'Invited'
  return 'Unknown'
}

const getInvitedCount = (reviewers: ReviewerData[]) =>
  reviewers.filter((reviewer) => reviewer.InvitedDate).length

const getAcceptedCount = (reviewers: ReviewerData[]) =>
  reviewers.filter((reviewer) => reviewer.AcceptedDate).length

const getCompletedCount = (reviewers: ReviewerData[]) =>
  reviewers.filter((reviewer) => reviewer.CompletedDate).length

const toggleRevision = (revision: RevisionData) => {
  revision.Collapsed = !revision.Collapsed
}

const toggleReviewer = (reviewer: ReviewerData) => {
  reviewer.Collapsed = !reviewer.Collapsed
}

const getDaysSince = (timestamp: number) => {
  const date = new Date(timestamp * 1000) // Convert seconds to milliseconds
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="px-4 pb-12 pt-16 md:pb-24">
      <div class="mx-auto flex items-center justify-center space-x-4">
        <div>
          <img src="/favicon.png" alt="Logo" class="mx-auto h-12 w-12 object-cover object-center" />
        </div>
        <div class="text-center text-2xl md:text-4xl">
          <span>Elsevier Review Tracker</span>
        </div>
      </div>
    </header>

    <main class="flex-grow">
      <div class="mx-auto flex max-w-2xl flex-col space-y-6 px-4">
        <div>
          <p>
            Enter the <span class="underline underline-offset-2">UUID</span> of your article to view
            detailed information about the current status of the review process.
          </p>

          <p class="text-sm text-gray-600">
            The UUID can be found in the URL of the review submission page, typically in the format:
            <code>https://track.authorhub.elsevier.com/?uuid={UUID}</code>
          </p>
        </div>
        <div class="flex space-x-4 text-sm md:text-base">
          <input
            class="focus:shadow-outline appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none md:w-3/4"
            id="uuid"
            type="text"
            placeholder="uuid"
            v-model="uuid"
          />
          <button
            class="rounded bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 md:w-1/4"
            @click="fetchReviewData"
          >
            Get review data
          </button>
        </div>
        <div>
          <div v-if="isLoading" class="mt-8 text-center">
            <p>Loading...</p>
          </div>
          <div v-else-if="error" class="mt-8 text-center">
            <p class="text-red-500">{{ error }}</p>
          </div>
          <div v-else-if="reviewData" class="my-8">
            <div class="flex flex-col space-y-2 rounded bg-white p-4 shadow-lg">
              <div>
                <span class="font-semibold">Title</span>:
                <span>{{ reviewData.ManuscriptTitle }}</span>
              </div>
              <div>
                <span class="font-semibold">Corresponding Author</span>:
                <span>{{ reviewData.CorrespondingAuthor }}</span>
              </div>
              <div>
                <span class="font-semibold">Journal</span>:
                <span>{{ reviewData.JournalName }} ({{ reviewData.JournalAcronym }})</span>
              </div>
              <div>
                <span class="font-semibold">Submitted on</span>:
                <span>{{ getReadableDate(reviewData.SubmissionDate) }}</span> ({{
                  getDaysSince(reviewData.SubmissionDate)
                }}
                days ago)
              </div>
              <div>
                <span class="font-semibold">Last updated on</span>:
                <span>{{ getReadableDate(reviewData.LastUpdated) }}</span> ({{
                  getDaysSince(reviewData.LastUpdated)
                }}
                days ago)
              </div>
              <div class="flex flex-col-reverse space-y-2 space-y-reverse">
                <div
                  v-for="revision in reviewData.Revisions"
                  :key="revision.Id"
                  class="flex flex-col space-y-2 rounded bg-slate-100 p-4 transition-all duration-500 ease-in-out"
                  :class="{
                    'max-h-16 overflow-hidden md:max-h-12': revision.Collapsed,
                    'max-h-[1000px] overflow-scroll': !revision.Collapsed,
                  }"
                >
                  <div class="flex justify-between">
                    <div>
                      <span class="font-semibold">Revision {{ revision.Id }}</span>
                      (<span class="font-medium">Invited</span>:
                      {{ getInvitedCount(revision.Reviewers) }},
                      <span class="font-medium">Accepted</span>:
                      {{ getAcceptedCount(revision.Reviewers) }},
                      <span class="font-medium">Completed</span>:
                      {{ getCompletedCount(revision.Reviewers) }})
                    </div>
                    <button class="text-indigo-500" @click="toggleRevision(revision)">
                      {{ revision.Collapsed ? '+' : '-' }}
                    </button>
                  </div>
                  <div class="flex flex-col-reverse space-y-2 space-y-reverse">
                    <div
                      v-for="reviewer in revision.Reviewers"
                      :key="reviewer.Id"
                      class="rounded p-2 transition-all duration-300 ease-in-out"
                      :class="{
                        'max-h-10 overflow-hidden': reviewer.Collapsed,
                        'max-h-48 overflow-scroll': !reviewer.Collapsed,
                        'bg-gray-200': getStatus(reviewer) === 'Invited',
                        'bg-indigo-200': getStatus(reviewer) === 'Accepted',
                        'bg-green-200': getStatus(reviewer) === 'Completed',
                      }"
                    >
                      <div>
                        <div class="flex justify-between">
                          <div class="mb-4 font-semibold">Reviewer {{ reviewer.Id }}</div>
                          <button class="text-indigo-500" @click="toggleReviewer(reviewer)">
                            {{ reviewer.Collapsed ? '+' : '-' }}
                          </button>
                        </div>
                        <div class="text-sm">
                          <div>
                            <span class="font-semibold">Status</span>:
                            <span>{{ getStatus(reviewer) }}</span>
                          </div>
                          <div>
                            <span class="font-semibold">Invited on</span>:
                            <span>{{ getReadableDate(reviewer.InvitedDate) }}</span> ({{
                              getDaysSince(reviewer.InvitedDate)
                            }}
                            days ago)
                          </div>
                          <div v-if="reviewer.AcceptedDate">
                            <span class="font-semibold">Accepted on</span>:
                            <span>{{ getReadableDate(reviewer.AcceptedDate) }}</span> ({{
                              getDaysSince(reviewer.AcceptedDate)
                            }}
                            days ago)
                          </div>
                          <div v-if="reviewer.CompletedDate">
                            <span class="font-semibold">Completed on</span>:
                            <span>{{ getReadableDate(reviewer.CompletedDate) }}</span> ({{
                              getDaysSince(reviewer.CompletedDate)
                            }}
                            days ago)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="mb-4 flex justify-center">
      <div
        class="mx-auto flex flex-col space-x-4 py-4 text-center text-sm text-gray-600 md:flex-row"
      >
        <div>© 2025 Elsevier Review Tracker</div>
        <div>
          <a
            class="hover:text-indigo-500"
            href="https://github.com/Chevrefeuille/elsevier-review-tracker"
            ><font-awesome-icon :icon="['fab', 'github']" class="text-xl"
          /></a>
        </div>
        <div>
          <a class="hover:text-indigo-500 hover:underline" href="https://ko-fi.com/chevrefeuye"
            >Buy me a coffee</a
          >
        </div>
      </div>
    </footer>
  </div>
</template>
