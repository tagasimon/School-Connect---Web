export type UserRole = 'super_admin' | 'school_admin' | 'teacher' | 'accountant' | 'parent'
export type SubscriptionStatus = 'active' | 'inactive' | 'trial'
export type AttendanceStatus = 'present' | 'absent'
export type SmsStatus = 'pending' | 'sent' | 'failed'
export type ContractStatus = 'draft' | 'active' | 'expired' | 'cancelled'

export interface SchoolDoc {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  subscription_status: SubscriptionStatus
  subscription_plan: string | null
  created_at: string
  updated_at: string
}

export interface ProfileDoc {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: UserRole
  school_id: string | null
  created_at: string
  updated_at: string
}

export interface TermDoc {
  id: string
  school_id: string
  name: string
  year: number
  start_date: string
  end_date: string
  is_current: boolean
  created_at: string
}

export interface ClassDoc {
  id: string
  school_id: string
  name: string
  term_id: string
  /** Denormalised from the linked Term document */
  term_name?: string | null
  teacher_id: string | null
  created_at: string
}

export interface SubjectDoc {
  id: string
  school_id: string
  class_id: string
  name: string
  created_at: string
}

export interface StudentDoc {
  id: string
  school_id: string
  class_id: string
  full_name: string
  student_number: string | null
  date_of_birth: string | null
  gender: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface ParentStudentDoc {
  id: string
  parent_id: string
  student_id: string
  relationship: string | null
  is_primary: boolean
  created_at: string
}

export interface AttendanceDoc {
  id: string
  student_id: string
  class_id: string
  school_id: string
  date: string
  status: AttendanceStatus
  marked_by: string
  notes: string | null
  sms_sent: boolean
  created_at: string
}

export interface ResultDoc {
  id: string
  student_id: string
  class_id: string
  school_id: string
  subject_id: string
  /** Denormalised from the linked Subject document */
  subject_name?: string | null
  term_id: string
  /** Denormalised from the linked Term document */
  term_name?: string | null
  term_year?: number | null
  marks_obtained: number
  marks_total: number
  grade: string | null
  remarks: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface FeeDoc {
  id: string
  student_id: string
  school_id: string
  term_id: string
  /** Denormalised from the linked Term document */
  term_name?: string | null
  term_year?: number | null
  total_amount: number
  amount_paid: number
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface FeeStructureDoc {
  id: string
  school_id: string
  class_id: string
  term_id: string
  amount: number
  payment_deadline: string | null  // ISO date string
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface PaymentDoc {
  id: string
  fee_id: string
  student_id: string
  school_id: string
  amount: number
  receipt_number: string
  payment_date: string  // ISO date string
  notes: string | null
  created_by: string
  created_at: string
}

export interface AnnouncementDoc {
  id: string
  school_id: string
  class_id: string | null
  title: string
  body: string
  target: 'school' | 'class' | 'parent' | 'teacher'
  sms_sent: boolean
  created_by: string
  created_at: string
}

export interface CommitmentTypeDoc {
  id: string
  school_id: string
  name: string
  default_amount: number
  is_active: boolean
  created_at: string
}

export interface StudentCommitmentDoc {
  id: string
  student_id: string
  school_id: string
  commitment_type_id: string | null
  name: string
  amount: number
  created_at: string
}

export interface SmsLogDoc {
  id: string
  school_id: string
  to_phone: string
  message: string
  status: SmsStatus
  provider_ref: string | null
  error: string | null
  created_at: string
}

export interface SalesRepDoc {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SchoolContractDoc {
  id: string
  school_id: string
  agreed_amount: number
  status: ContractStatus
  contract_person_name: string | null
  contract_person_phone: string | null
  contract_person_email: string | null
  contract_person_role: string | null
  sales_rep_id: string | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ContractPaymentDoc {
  id: string
  contract_id: string
  school_id: string
  amount: number
  payment_date: string
  reference: string | null
  notes: string | null
  recorded_by: string | null
  created_at: string
}
