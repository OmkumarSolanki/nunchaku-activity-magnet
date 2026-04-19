export interface UserProfile {
  id: string
  name: string
  avatarDescription?: string
  avatarGender?: string
  avatarAgeRange?: string
  avatarImageBase64: string
  activity: string
  location: string
  timeStart: number
  timeEnd: number
  color: string
  createdAt: number
}
