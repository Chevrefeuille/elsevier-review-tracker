export enum ReviewEventType {
  Invited = 'REVIEWER_INVITED',
  Accepted = 'REVIEWER_ACCEPTED',
  Completed = 'REVIEWER_COMPLETED',
}

export type ReviewEvent = {
  Date: number
  Event: ReviewEventType
  Revision: number
  Id: number
}

export type ReviewData = {
  Uuid: string
  CorrespondingAuthor: string
  DocumentId: number
  FirstAuthor: string
  JournalAcronym: string
  JournalName: string
  LastUpdated: number
  LatestRevisionNumber: number
  ManuscriptTitle: string
  PubdNumber: string
  ReviewEvents: ReviewEvent[]
  Status: number
  SubmissionDate: number
}

export type ReviewerData = {
  Id: number
  InvitedDate: number
  AcceptedDate: number
  CompletedDate: number
  LastUpdated: number
  Collapsed: boolean
}

export type ReviewerMap = {
  [key: number]: ReviewerData
}

export type RevisionMap = {
  [key: number]: ReviewerMap
}

export type FormattedReviewData = {
  CorrespondingAuthor: string
  JournalAcronym: string
  JournalName: string
  LastUpdated: number
  ManuscriptTitle: string
  SubmissionDate: number
  Revisions: RevisionData[]
}

export type RevisionData = {
  Id: number
  Collapsed: boolean
  Reviewers: ReviewerData[]
}
