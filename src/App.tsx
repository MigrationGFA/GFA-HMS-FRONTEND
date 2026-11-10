import "@/lib/demo/inpatientCase";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireRole } from "@/components/RequireRole";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatNotificationProvider } from "@/contexts/ChatNotificationContext";
import { DatabaseProvider } from "@/contexts/DatabaseProvider";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/site/HomePage";
import AboutPage from "./pages/site/AboutPage";
import ServicesListPage from "./pages/site/ServicesListPage";
import DepartmentsPage from "./pages/site/DepartmentsPage";
import DoctorsPage from "./pages/site/DoctorsPage";
import NewsPage from "./pages/site/NewsPage";
import CareersPage from "./pages/site/CareersPage";
import ContactPage from "./pages/site/ContactPage";
import AppointmentPage from "./pages/site/AppointmentPage";
import { AdminOverview, AdminRevenue, AdminStaff, AdminPackages, AdminInsights } from "./pages/AdminDashboard";
import { AdminDepartments } from "./pages/admin/AdminDepartments";
import { AdminReports } from "./pages/admin/AdminPeople";
import { AdminOperations, AdminInventory, AdminSettings } from "./pages/admin/AdminOps";
import { AdminProvider } from "./contexts/AdminStore";
import {
  SuperAdminOverview, SuperAdminHospitals, SuperAdminRoles, SuperAdminStaff, SuperAdminForms,
  SuperAdminWorkflows, SuperAdminApprovals, SuperAdminAudit, SuperAdminEmergency, SuperAdminImpersonate,
  SuperAdminNotifications, SuperAdminConfig, SuperAdminEmr, SuperAdminBackup, SuperAdminSecurity,
  SuperAdminIntegrations, SuperAdminAi, SuperAdminCoding, SuperAdminNhis, SuperAdminSessions,
} from "./pages/SuperAdminDashboard";
import {
  IamOverview, IamAuthentication, IamIdentity, IamNin, IamRbac, IamEmergency as IamEmergencyPage,
  IamAudit, IamGeo, IamIp, IamSessions as IamSessionsPage, IamThreats, IamEncryption, IamHybrid,
  IamAi, IamAlerts, IamMobile, IamCompliance, IamConfidentiality, IamApi, IamSoc,
} from "./pages/IamSecurityCenter";
import {
  MpiOverview, MpiNewPatient, MpiLookup, MpiNin, MpiNhia, MpiPhoto, MpiBiometrics,
  MpiECard, MpiFamily, MpiNok, MpiRisk, MpiCross, MpiLegacy, MpiDuplicates,
  MpiWalkin, MpiEmergency, MpiAnalytics, MpiAudit, MpiConfidentiality,
  MpiOffline, MpiMobile, MpiAi, MpiWorkflow,
} from "./pages/PatientRegistrationMpi";
import {
  PortalOverview, PortalAuth, PortalDashboard, PortalAppointments, PortalWallet, PortalInvoices,
  PortalAdmission, PortalAccommodation, PortalTelemedicine, PortalCaregivers, PortalEmergency,
  PortalNotifications, PortalProfile, PortalRestrictions, PortalConfidentiality, PortalLegacy,
  PortalOffline, PortalPwa, PortalSupport, PortalAi, PortalAnalytics, PortalIntegration,
  PortalCloud, PortalWeb,
} from "./pages/PatientPortalCenter";
import {
  SchedulingOverview, GmpcScheduling, OpcScheduling, EmergencyScheduling, AssignmentEngine,
  CalendarManagement, QueueManagement, TelemedicineScheduling, Reminders, OtpVerification,
  PaymentGate, FollowUpEngine, Confidentiality as SchedConfidentiality, WalkIn, InpatientConsults,
  SchedulingAnalytics, Offline as SchedOffline, MobileTablet, HmsIntegration, AiScheduling,
  SchedulingAudit, CloudDeployment, WebsiteBridge,
} from "./pages/AppointmentSchedulingCenter";
import {
  BillingOverview as BillingCenterOverview, WalletEngine, ServiceBilling, DepartmentalBilling,
  InsuranceBilling, PsychiatryBilling, PaymentProcessing, SplitBilling, InvoiceManagement,
  RefundsReversals, FinancialNotes, PaymentTracking, AccommodationBilling, ReceiptGeneration,
  CashierPos, FinancialAnalytics, BillingAudit, AiInsights, HmsIntegration as BillingHmsIntegration,
  OfflineMode as BillingOffline, EnterpriseDeployment,
} from "./pages/BillingRevenueCenter";
import {
  EmrOverview, PatientMasterRecord, ClinicalTimeline, DoctorDocs, NursingDocs, PsychologyDocs,
  PharmacyIntegration, LabIntegration, RadiologyIntegration, SoapNotes, CarePlans, ConsentForms,
  ClinicalAlerts, SmartFilters, ClinicalTags, IcdDsm, AiSummary, CrossDeptSync, LegacyBridge,
  EmrNotifications, EmrAudit, MobileWard, OfflineCloud, HmsIntegrationPanel as EmrHmsIntegration,
} from "./pages/EmrCoreCenter";
import {
  DocOverview, DocModes, DocWorkspace, DocDocumentation, DocTimeline, DocPrescriptions,
  DocLab, DocImaging, DocAdmission, DocReferrals, DocTransfers, DocActive, DocAi,
  DocDiagnosis, DocWardRound, DocResults, DocDischarge, DocEmergency, DocCrossDept,
  DocSync, DocMobile, DocAudit,
} from "./pages/DoctorClinicalCenter";
import { StaffDashboard, StaffAppointments, StaffTasks, StaffInvoices, StaffBookings, StaffAttendance, StaffLeave, StaffProfile } from "./pages/StaffDashboard";
import { StudentDashboard, StudentCourses, StudentPayments } from "./pages/StudentDashboard";
import {
  PatientOverview, PatientBooking, PatientHistory, PatientInvoices,
  PatientRecords, PatientLab, PatientPrescriptions, PatientNotifications, PatientProfile,
} from "./pages/PatientDashboard";
import InvoicePage from "./pages/InvoicePage";
import ServicesPage from "./pages/ServicesPage";
import { CmdOverview } from "./pages/CmdDashboard";
import { BoardOverview } from "./pages/BoardDashboard";
import { FinanceOverview, FinanceInvoices, FinanceRevenue, FinancePayments, FinanceDepartments, FinanceStaffRevenue, FinanceCashFlow, FinanceReports, FinanceAttendance, FinanceLeave, FinanceProfile, FinanceDischargeBilling } from "./pages/FinanceDashboard";
import {
  HrOverview, HrKpis, HrStaff, HrRecruitment, HrOnboarding, HrAttendance, HrLeave,
  HrPerformance, HrPayroll, HrTraining, HrCompliance, HrExit, HrRetirement, HrAlerts,
  HrSupport, HrReports,
} from "./pages/HrDashboard";
import { DoctorOverview, DoctorAppointments, DoctorSchedule, DoctorEHealth, DoctorPerformancePage, DoctorAttendance, DoctorProfile } from "./pages/DoctorDashboard";
import {
  DoctorPatientDirectory, DoctorMySchedule, DoctorAppointmentMgmt, DoctorTasks, DoctorComms,
  DoctorCDS, DoctorCertificates, DoctorTelemedicine, DoctorNotifications, DoctorResearch,
  DoctorAnalytics, DoctorClinicalProfile,
} from "./pages/DoctorExtended";
import { ItOverview, ItSystemStatus, ItLogs, ItAlerts } from "./pages/ItDashboard";
import {
  PatientManagement, BillingPos, LaboratoryModule, PharmacyModule, PharmacyStock,
  IpdModule, AdmissionsModule, DischargeModule, SyncModule, AuditModule,
  LabOverview,
  PatientIdentityEngine, DuplicateReviewQueue,
} from "./pages/HmsModules";
import { RecordsOverview } from "./pages/records/RecordsDashboardPage";
import {
  TriageQueue, AdmissionRequests as RecordsAdmissionRequests, PatientDirectory,
  DocumentManagement, RecordsAuditTrail,
} from "./pages/RecordsDepartmentCenter";
import { DailyReports } from "./pages/records/RecordsReportsPage";
import { RecordsAnalytics } from "./pages/records/RecordsAnalyticsPage";
import {
  AppointmentCheckIn, PatientArrival, DuplicatePatientManagement,
} from "./pages/RecordsExtended";
import { MedicalRecordRetrieval } from "./pages/records/RecordsRetrievalPage";
import { RecordArchive } from "./pages/records/RecordsArchivePage";
import { RecordsProfile } from "./pages/records/RecordsProfilePage";
import { PatientHistoryPage, PatientDocumentsPage, PatientProfilePage } from "./pages/PatientDirectoryDetails";

import {
  NurseDashboard, NurseWorkspace, NurseNotes, NurseVitals, NurseMar, NurseExternalMeds,
  NurseObservation, NurseIcu, NurseCharts, NurseShifts, NurseHandover, NurseCarePlan,
  NurseAdmissions, NurseDischarge, NurseNok, NurseTimeline, NurseAlerts, NurseComms,
  NurseReports, NurseAnalytics, NurseMobile,
  NurseForms, NurseTasks, NurseDoctorOrders, NurseSamples, NurseIncidents,
} from "./pages/NursingCenter";
import { NursePatientQueues } from "./pages/NursePatientQueues";
import NurseTransferQueue from "./pages/NurseTransferQueue";
import NurseReferralQueue from "./pages/NurseReferralQueue";
import RecordsTransfersLive from "./pages/records/RecordsTransfersLive";
import RecordsReferralsLive from "./pages/records/RecordsReferralsLive";
import RecordsDischargeLive from "./pages/records/RecordsDischargeLive";

const NURSE_ROLES = ['superadmin', 'admin', 'cmd', 'nurse', 'icu'] as const;

import {
  CashierDashboard, InvoicePayment, PatientPaymentSearch, PendingBills, PaidBills,
  PartPayments, PatientWallet, RefundsReversals as CashierRefunds, DiscountsWaivers,
  NhisHmoCopay, PosTransferConfirm, DailyClosing, RevenueReports as CashierReports,
  ReceiptVerification, CashierAuditTrail, CashierSettings, NewPatientCardPayments,
  OnlineBookingPayments, PharmacyWalkInPayments, BillsPaymentsHub,
} from "./pages/CashierCenter";
import { CashierProfile } from "./pages/cashier/CashierProfilePage";
import { CashierComms } from "./pages/cashier/CashierCommsPage";
import { RecordsComms } from "./pages/records/RecordsCommsPage";

const CASHIER_ROLES = ['superadmin', 'admin', 'cmd', 'finance', 'cashier'] as const;

import {
  BillingOverview, VisitsInvoices, MultiChannelPay, PosTerminal,
  ReconciliationEngine, ConsultationGate, BillingAuditTrail,
} from "./pages/BillingInitiation";
import {
  ConsultationQueue, ConsultationWorkspace, ActiveConsultations,
  CompletedConsultations, ConsultationSyncQueue,
} from "./pages/ConsultationModule";
import {
  LabDashboard, LabRequestsList, LabSampleCollection, LabProcessing,
  LabResultEntry, LabVerification, LabReleased, LabSyncQueue,
  LabCatalog, LabAudit, LabRequestDetail,
} from "./pages/LabModule";
import {
  PharmacyDashboard, PharmacyQueue, PharmacyReview, PharmacyDispense,
  PharmacyCompleted, PharmacyInventory, PharmacyMovements,
  PharmacySyncQueue, PharmacyAudit, PharmacyRxDetail,
} from "./pages/PharmacyModule";
import PharmacyProcurement from "./pages/PharmacyProcurement";
import PharmacyDrugCatalog from "./pages/PharmacyDrugCatalog";
import {
  IpdDashboard, AdmissionRequests, BedBoard, ActiveAdmissions, DailyCare,
  ContinuousBilling, TransfersPage, LongStayAlerts, DischargeQueue,
  IpdSyncPage, AdmissionDetail,
} from "./pages/IpdModuleNew";
import {
  DischargeDashboard, DischargeQueuePage, BillAggregation, ValidationFlags,
  PaymentCollection, FinanceClearance, BedReleasePage, DischargeSummaries,
  DischargeEmrSync, DischargeDisputes, DischargeAuditTrail, DischargeCaseDetail,
} from "./pages/DischargeModuleNew";
import {
  AdmissionDashboard, AdmissionWizard, WardManagement, BedManagement, PatientMovementCenter,
  TransferCenter, AccommodationCenter, DischargeWorkspace, TrialLeaveModule, DamaModule,
  ReferralCenter, CareTeamCenter, WardRoundCenter, ReportingCenter as AdmReportingCenter,
  AnalyticsCenter as AdmAnalyticsCenter, CommsCenter as AdmCommsCenter, MobileBedside,
  WardBedConfig,
} from "./pages/AdmissionWardCenter";
import {
  LabCenterDashboard, LabBillingInterface,
  LabDrugScreen, LabCulture, LabSfa, LabBloodBank, LabHistoryCenter,
  LabAllResults, LabPrintCenter, LabComms, LabReports, LabAnalytics, LabAlerts,
  LabMobile, LabConfig, LabProfile,
} from "./pages/LaboratoryCenter";
import { LabRequestCenter } from "./pages/LabRequestCenterPage";
import { LabWalkInWorkflow } from "./pages/LabWalkInWorkflowPage";
import { LabSamplesPage } from "./pages/lab/LabSamplesPage";
import { LabResultsPage } from "./pages/lab/LabResultsPage";
import { LabValidationPage } from "./pages/lab/LabValidationPage";
import { LabAmendmentPage } from "./pages/lab/LabAmendmentPage";
import { LabTemplatesPage } from "./pages/lab/LabTemplatesPage";
import {
  SpecimenTrackingCenter, MicrobiologyWorkbench, HistopathologyCenter, QualityControlCenter,
} from "./pages/LaboratoryExtended";
import {
  PharmacyCenterDashboard, PharmacyQueueCenter, PharmacyDispenseWorkspace,
  PharmacyReconciliationCenter, PharmacyExternalMeds, PharmacyInventoryCenter,
  PharmacyMovementCenter, PharmacyExpiryCenter, PharmacyForecastCenter,
  PharmacyInteractionCenter, PharmacyControlledRegister, PharmacyInpatientCenter,
  PharmacyNhiaCenter, PharmacyBillingCenter, PharmacyReturnsCenter,
  PharmacyDispenseReconciliation, PharmacyTimelineCenter, PharmacyReportsCenter,
  PharmacyAnalyticsCenter, PharmacyCommsCenter, PharmacyMobileMode, PharmacyConfigCenter,
} from "./pages/PharmacyCenter";
import { PharmacyProfile } from "./pages/pharmacy/PharmacyProfilePage";
import {
  ImagingRequestCenter,
  RadiologyConfig, RadiologyAuditTrail,
} from "./pages/RadiologyCenter";
import {
  LiveRadiologyDashboard as RadiologyDashboard,
  LiveRadiologyRequestQueue as RadiologyRequestQueue,
  LiveImagingScheduling as ImagingScheduling,
  LivePatientPreparation as PatientPreparation,
  LiveExaminationRoom as ExaminationRoom,
  LiveRadiologyReportEntry as RadiologyReportEntry,
  LiveRadiologyValidation as RadiologyValidation,
  LiveCriticalFindings as CriticalFindings,
  LiveResultRelease as ResultRelease,
  LiveEcgReporting as EcgReporting,
  LiveEegReporting as EegReporting,
  LiveRadiologyBilling as RadiologyBilling,
  LiveRadiologyEquipment as RadiologyEquipment,
  LiveRadiologyConsumables as RadiologyConsumables,
  LiveRadiologyForms as RadiologyForms,
  LiveRadiologyAnalytics as RadiologyAnalytics,
  LiveImageArchive as ImageArchive,
  LiveRadiologyPrintCenter as RadiologyPrintCenter,
  LiveRadiologyAlerts as RadiologyAlerts,
  LivePacsViewer as PacsViewer,
  LiveRadiologyMobile as RadiologyMobile,
  LiveImageUploadCenter as ImageUploadCenter,
  LiveRadiologyComms as RadiologyComms,
  LiveRadiologyReports as RadiologyReports,
  LiveRadiologyHistory as RadiologyHistory,
  LiveAllImagingResults as AllImagingResults,
  LiveAiAssistant as AiAssistant,
} from "./pages/radiology/RadiologyWorkflowPages";

const RAD_ADMIN_ROLES = ['superadmin', 'admin', 'cmd', 'radiology'] as const;
const RAD_REPORTING_ROLES = ['superadmin', 'admin', 'cmd', 'radiology', 'doctor'] as const;
const RAD_TECH_ROLES = ['superadmin', 'admin', 'cmd', 'radiology'] as const;
const DENTAL_ROLES = ['superadmin', 'admin', 'cmd', 'dental', 'doctor'] as const;
const EYE_ROLES = ['superadmin', 'admin', 'cmd', 'eye', 'doctor'] as const;
const PAEDS_ROLES = ['superadmin', 'admin', 'cmd', 'paeds', 'doctor', 'nurse'] as const;
const ADMIN_OFFICER_ROLES = ['superadmin', 'admin', 'cmd'] as const;

import {
  PsychOpcDashboard, PsychOpcQueue, PsychOpcConsultation, PsychOpcAssessment,
  PsychOpcMse, PsychOpcDiagnosis, PsychOpcPrescriptions, PsychOpcInvestigations,
  PsychOpcRisk, PsychOpcAdmission, PsychOpcAppointments, PsychOpcPsychology,
  PsychOpcWelfare, PsychOpcEmergency, PsychOpcReports, PsychOpcSettings,
} from "./pages/PsychiatricOpcCenter";

const OPC_ROLES = ['superadmin', 'admin', 'cmd', 'doctor', 'psychopc', 'nurse', 'records'] as const;
import {
  PsychologyDashboard, AssessmentCenter, IqAssessment, PersonalityAssessment,
  TherapyManagement, SatsatProgram, DocumentationCenter, TreatmentPlans,
  ReferralManagement, SessionScheduling, OutcomeMonitoring, PsychologyBilling,
  NhiaMapping, PsychologyReports, ResearchStatistics, CommsCenter as PsyCommsCenter,
  StaffOnboarding, PsychologyAlerts, PsychologyMobile, PsychologyConfig,
} from "./pages/PsychologyCenter";
import {
  CapDashboard, ChildRegistration, AssessmentCenter as CapAssessmentCenter, DevelopmentTracking,
  AutismCenter, AdhdCenter, SafeguardingCenter, FamilyCounselling, SchoolServices,
  MdtCollaboration, TherapyManagement as CapTherapyManagement, MedicationCenter,
  FollowUpDashboard, CapBilling, ResearchStatistics as CapResearchStatistics,
  ReportingCenter as CapReportingCenter, CommsCenter as CapCommsCenter,
  CapAlerts, CapMobile, CapConfig,
} from "./pages/ChildAdolescentPsychiatryCenter";
import {
  AddictionDashboard, AddictionAssessmentCenter, AsiCenter, DetoxManagement,
  RehabilitationCenter, DrugScreening, TherapyManagement as AdxTherapy, FamilyInvolvement,
  OccupationalRehab, RelapsePrevention, CommunityReintegration, InpatientRehab,
  DischargeAftercare, FollowUpCenter as AdxFollowUp, AddictionBilling,
  ResearchStatistics as AdxResearch, ReportingCenter as AdxReports,
  CommunicationCenter as AdxComms, AddictionAlerts, AddictionMobile, AddictionConfig,
} from "./pages/AddictionRehabCenter";
import {
  PsychogeriatricsDashboard, ElderlyRegistry, MemoryClinic, CognitiveAssessment,
  FunctionalAssessment, FrailtyFallsCenter, ElderAbuseScreening, CaregiverCenter,
  MedicationReview, LongTermCare, HomeCareCommunity, FamilySupport,
  InpatientPsychogeriatrics, FollowUpManagement, PsychogeriatricsBilling,
  PsychogeriatricsResearch, PsychogeriatricsReports, PsychogeriatricsComms,
  PsychogeriatricsAlerts, PsychogeriatricsMobile, PsychogeriatricsConfig,
} from "./pages/PsychogeriatricsCenter";
import {
  PhysiotherapyDashboard, ReferralCenter as PhysioReferralCenter, AssessmentCenter as PhysioAssessmentCenter,
  MobilityAssessment, FallsPrevention, TreatmentPlans as PhysioTreatmentPlans, ExercisePrescription,
  TherapySessions as PhysioTherapySessions, NeuroRehab, PsychiatricRehab, ChildPhysio, GeriatricPhysio,
  AddictionPhysio, AssistiveDevices, InpatientPhysio, OutpatientPhysio,
  FollowUpDashboard as PhysioFollowUp, PhysiotherapyBilling, PhysiotherapyResearch,
  PhysiotherapyReports, PhysiotherapyComms, PhysiotherapyAlerts, PhysiotherapyMobile, PhysiotherapyConfig,
} from "./pages/PhysiotherapyCenter";
import {
  SpeechTherapyDashboard, SpeechReferralCenter, SpeechAssessmentCenter, SpeechDisorders,
  LanguageDisorders, VoiceFluencyDisorders, DysphagiaCenter, AutismCommunication,
  CognitiveCommunication, TreatmentPlans as SpeechTreatmentPlans, TherapySessions as SpeechTherapySessions,
  FamilyTraining, HomeProgramCenter, Teletherapy, ChildSpeechTherapy, AdultSpeechTherapy,
  InpatientSpeech, OutpatientSpeech, SmartTaskQueue, OfflineSync, SpeechFollowUp,
  SpeechTimeline, SpeechBilling, SpeechResearch, SpeechReports, SpeechComms,
  SpeechAlerts, SpeechMobile, SpeechConfig,
} from "./pages/SpeechTherapyCenter";
import {
  NutritionDashboard, NutritionReferralCenter, NutritionAssessmentCenter, AnthropometricCenter,
  MalnutritionScreening, DietPlanManagement, TherapeuticDiets, InpatientFeeding, EnteralFeeding,
  CateringKitchen, AllergyRestrictions, NutritionCounselling, ChildNutrition,
  AddictionRecoveryNutrition, PsychogeriatricNutrition, CommunityNutrition, OutpatientNutrition,
  NutritionFollowUp, NutritionTimeline, NutritionBilling, NutritionResearch, NutritionReports,
  NutritionComms, NutritionAlerts, NutritionOffline, NutritionMobile, NutritionConfig,
} from "./pages/NutritionDieteticsCenter";
import {
  SocialWorkDashboard, SocialWorkReferralCenter, SocialAssessmentCenter, FamilyAssessment,
  HomeVisits, CommunityReintegration as SwCommunityReintegration, TrialLeave, DischargeAftercare as SwDischargeAftercare,
  ChildWelfare, ElderWelfare, AddictionRecoverySupport, LegalLiaison, VulnerablePatients, WelfareSupport, CommunityFollowUp,
  VocationalReintegration, SocialWorkFollowUp, SocialWorkTimeline, SocialWorkBilling,
  SocialWorkResearch, SocialWorkReports, SocialWorkComms, SocialWorkAlerts,
  SocialWorkOffline, SocialWorkMobile, SocialWorkConfig,
} from "./pages/SocialWorkCenter";
import {
  IcuDashboard, IcuAdmissionCenter, IcuBedManagement, IcuObservation, IcuCharts,
  IcuVentilator, IcuCodeBlue, IcuMedication, IcuLaboratory, IcuRadiology, IcuNutrition,
  IcuRehab, IcuHandover, IcuCarePlans, IcuTransfers, IcuDischarge, IcuBilling,
  IcuAnalytics, IcuMortality, IcuResearch, IcuComms, IcuTimeline, IcuFollowUp,
  IcuProductivity, IcuAlerts, IcuReports, IcuMobile, IcuConfig,
} from "./pages/IcuCriticalCareCenter";
import NotFound from "./pages/NotFound";
import { BillingStoreProvider } from "./contexts/BillingStore";
import { LabFlowProvider } from "./contexts/LabFlowStore";
import { NursingProvider } from "./contexts/NursingStore";
import { RadiologyProvider } from "./contexts/RadiologyStore";
import { DentalProvider } from "./contexts/DentalStore";
import { DentalDashboard } from "./pages/dental/DentalDashboard";
import { DentalPatientList } from "./pages/dental/DentalPatients";
import { DentalPatientProfile } from "./pages/dental/DentalPatientProfile";
import { DentalChartPage } from "./pages/dental/DentalOdontogram";
import { DentalEncounterList, DentalEncounterPage } from "./pages/dental/DentalEncounters";
import { DentalTreatmentPlans } from "./pages/dental/DentalPlans";
import { DentalProcedures } from "./pages/dental/DentalProcedures";
import { DentalPrescriptions } from "./pages/dental/DentalPrescriptions";
import { DentalInvestigations, DentalReferrals } from "./pages/dental/DentalInvestigations";
import { DentalAppointments, DentalSchedule } from "./pages/dental/DentalAppointments";
import { DentalFollowUps } from "./pages/dental/DentalFollowUps";
import { DentalServices } from "./pages/dental/DentalServices";
import { DentalInventory } from "./pages/dental/DentalInventory";
import { DentalClinicalReports, DentalOperationalReports } from "./pages/dental/DentalReports";
import { EyeProvider } from "./contexts/EyeStore";
import EyeDashboard from "./pages/eye/EyeDashboard";
import EyePatients from "./pages/eye/EyePatients";
import EyeAcuity from "./pages/eye/EyeAcuity";
import EyeRefraction from "./pages/eye/EyeRefraction";
import EyeExamination from "./pages/eye/EyeExamination";
import EyeConsultations from "./pages/eye/EyeConsultations";
import { EyeDiagnoses, EyeHistory } from "./pages/eye/EyeDiagnoses";
import { EyeContactLenses, EyeEducation, EyeFollowUps, EyeInvestigations, EyePlans, EyePrescriptions, EyeProcedures, EyeReferrals, EyeSpectacles } from "./pages/eye/EyeCare";
import { EyeAppointments, EyeEquipment, EyeInventory, EyeRooms, EyeSchedule } from "./pages/eye/EyeOps";
import { EyeClinicalReports, EyeOperationalReports } from "./pages/eye/EyeReports";
import { PaedsProvider } from "./contexts/PaedsStore";
import PaedsDashboard from "./pages/paeds/PaedsDashboard";
import PaedsPatients from "./pages/paeds/PaedsPatients";
import { PaedsChildHealth, PaedsDevelopment, PaedsDiagnoses, PaedsEncounters, PaedsGrowth, PaedsImmunisation, PaedsNewborn, PaedsNutrition, PaedsTriage } from "./pages/paeds/PaedsClinical";
import { PaedsAdmissions, PaedsDischarge, PaedsEmergency, PaedsFollowUps, PaedsInvestigations, PaedsObservations, PaedsPlans, PaedsPrescriptions, PaedsProcedures, PaedsReferrals, PaedsWards } from "./pages/paeds/PaedsCare";
import { PaedsAppointments, PaedsClinicalReports, PaedsEquipment, PaedsGrowthReports, PaedsImmunisationReports, PaedsOperationalReports, PaedsServices } from "./pages/paeds/PaedsOps";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <DatabaseProvider>
        <BillingStoreProvider>
        <LabFlowProvider>
        <NursingProvider>
        <RadiologyProvider>
        <DentalProvider>
        <EyeProvider>
        <PaedsProvider>
        <AdminProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ChatNotificationProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/services" element={<ServicesListPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/doctors" element={<DoctorsPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/appointment" element={<AppointmentPage />} />
            <Route path="/login" element={<LoginPage />} />
            {/* Super Admin */}
            <Route path="/dashboard/superadmin" element={<SuperAdminOverview />} />
            <Route path="/dashboard/superadmin/hospitals" element={<SuperAdminHospitals />} />
            <Route path="/dashboard/superadmin/roles" element={<SuperAdminRoles />} />
            <Route path="/dashboard/superadmin/staff" element={<SuperAdminStaff />} />
            <Route path="/dashboard/superadmin/forms" element={<SuperAdminForms />} />
            <Route path="/dashboard/superadmin/workflows" element={<SuperAdminWorkflows />} />
            <Route path="/dashboard/superadmin/approvals" element={<SuperAdminApprovals />} />
            <Route path="/dashboard/superadmin/audit" element={<SuperAdminAudit />} />
            <Route path="/dashboard/superadmin/emergency" element={<SuperAdminEmergency />} />
            <Route path="/dashboard/superadmin/impersonate" element={<SuperAdminImpersonate />} />
            <Route path="/dashboard/superadmin/notifications" element={<SuperAdminNotifications />} />
            <Route path="/dashboard/superadmin/config" element={<SuperAdminConfig />} />
            <Route path="/dashboard/superadmin/emr" element={<SuperAdminEmr />} />
            <Route path="/dashboard/superadmin/backup" element={<SuperAdminBackup />} />
            <Route path="/dashboard/superadmin/security" element={<SuperAdminSecurity />} />
            <Route path="/dashboard/superadmin/integrations" element={<SuperAdminIntegrations />} />
            <Route path="/dashboard/superadmin/ai" element={<SuperAdminAi />} />
            <Route path="/dashboard/superadmin/coding" element={<SuperAdminCoding />} />
            <Route path="/dashboard/superadmin/nhis" element={<SuperAdminNhis />} />
            <Route path="/dashboard/superadmin/sessions" element={<SuperAdminSessions />} />
            {/* IAM & Security Center */}
            <Route path="/dashboard/superadmin/iam" element={<IamOverview />} />
            <Route path="/dashboard/superadmin/iam/auth" element={<IamAuthentication />} />
            <Route path="/dashboard/superadmin/iam/identity" element={<IamIdentity />} />
            <Route path="/dashboard/superadmin/iam/nin" element={<IamNin />} />
            <Route path="/dashboard/superadmin/iam/rbac" element={<IamRbac />} />
            <Route path="/dashboard/superadmin/iam/emergency" element={<IamEmergencyPage />} />
            <Route path="/dashboard/superadmin/iam/audit" element={<IamAudit />} />
            <Route path="/dashboard/superadmin/iam/geo" element={<IamGeo />} />
            <Route path="/dashboard/superadmin/iam/ip" element={<IamIp />} />
            <Route path="/dashboard/superadmin/iam/sessions" element={<IamSessionsPage />} />
            <Route path="/dashboard/superadmin/iam/threats" element={<IamThreats />} />
            <Route path="/dashboard/superadmin/iam/encryption" element={<IamEncryption />} />
            <Route path="/dashboard/superadmin/iam/hybrid" element={<IamHybrid />} />
            <Route path="/dashboard/superadmin/iam/ai" element={<IamAi />} />
            <Route path="/dashboard/superadmin/iam/alerts" element={<IamAlerts />} />
            <Route path="/dashboard/superadmin/iam/mobile" element={<IamMobile />} />
            <Route path="/dashboard/superadmin/iam/compliance" element={<IamCompliance />} />
            <Route path="/dashboard/superadmin/iam/confidentiality" element={<IamConfidentiality />} />
            <Route path="/dashboard/superadmin/iam/api" element={<IamApi />} />
            <Route path="/dashboard/superadmin/iam/soc" element={<IamSoc />} />
            {/* Patient Registration & Master Patient Index */}
            <Route path="/dashboard/superadmin/mpi" element={<MpiOverview />} />
            <Route path="/dashboard/superadmin/mpi/new" element={<MpiNewPatient />} />
            <Route path="/dashboard/superadmin/mpi/lookup" element={<MpiLookup />} />
            <Route path="/dashboard/superadmin/mpi/nin" element={<MpiNin />} />
            <Route path="/dashboard/superadmin/mpi/nhia" element={<MpiNhia />} />
            <Route path="/dashboard/superadmin/mpi/photo" element={<MpiPhoto />} />
            <Route path="/dashboard/superadmin/mpi/biometrics" element={<MpiBiometrics />} />
            <Route path="/dashboard/superadmin/mpi/ecard" element={<MpiECard />} />
            <Route path="/dashboard/superadmin/mpi/family" element={<MpiFamily />} />
            <Route path="/dashboard/superadmin/mpi/nok" element={<MpiNok />} />
            <Route path="/dashboard/superadmin/mpi/risk" element={<MpiRisk />} />
            <Route path="/dashboard/superadmin/mpi/cross" element={<MpiCross />} />
            <Route path="/dashboard/superadmin/mpi/legacy" element={<MpiLegacy />} />
            <Route path="/dashboard/superadmin/mpi/duplicates" element={<MpiDuplicates />} />
            <Route path="/dashboard/superadmin/mpi/walkin" element={<MpiWalkin />} />
            <Route path="/dashboard/superadmin/mpi/emergency" element={<MpiEmergency />} />
            <Route path="/dashboard/superadmin/mpi/analytics" element={<MpiAnalytics />} />
            <Route path="/dashboard/superadmin/mpi/audit" element={<MpiAudit />} />
            <Route path="/dashboard/superadmin/mpi/confidentiality" element={<MpiConfidentiality />} />
            <Route path="/dashboard/superadmin/mpi/offline" element={<MpiOffline />} />
            <Route path="/dashboard/superadmin/mpi/mobile" element={<MpiMobile />} />
            <Route path="/dashboard/superadmin/mpi/ai" element={<MpiAi />} />
            <Route path="/dashboard/superadmin/mpi/workflow" element={<MpiWorkflow />} />
            {/* Patient Portal & PWA */}
            <Route path="/dashboard/superadmin/portal" element={<PortalOverview />} />
            <Route path="/dashboard/superadmin/portal/auth" element={<PortalAuth />} />
            <Route path="/dashboard/superadmin/portal/dashboard" element={<PortalDashboard />} />
            <Route path="/dashboard/superadmin/portal/appointments" element={<PortalAppointments />} />
            <Route path="/dashboard/superadmin/portal/wallet" element={<PortalWallet />} />
            <Route path="/dashboard/superadmin/portal/invoices" element={<PortalInvoices />} />
            <Route path="/dashboard/superadmin/portal/admission" element={<PortalAdmission />} />
            <Route path="/dashboard/superadmin/portal/accommodation" element={<PortalAccommodation />} />
            <Route path="/dashboard/superadmin/portal/telemedicine" element={<PortalTelemedicine />} />
            <Route path="/dashboard/superadmin/portal/caregivers" element={<PortalCaregivers />} />
            <Route path="/dashboard/superadmin/portal/emergency" element={<PortalEmergency />} />
            <Route path="/dashboard/superadmin/portal/notifications" element={<PortalNotifications />} />
            <Route path="/dashboard/superadmin/portal/profile" element={<PortalProfile />} />
            <Route path="/dashboard/superadmin/portal/restrictions" element={<PortalRestrictions />} />
            <Route path="/dashboard/superadmin/portal/confidentiality" element={<PortalConfidentiality />} />
            <Route path="/dashboard/superadmin/portal/legacy" element={<PortalLegacy />} />
            <Route path="/dashboard/superadmin/portal/offline" element={<PortalOffline />} />
            <Route path="/dashboard/superadmin/portal/pwa" element={<PortalPwa />} />
            <Route path="/dashboard/superadmin/portal/support" element={<PortalSupport />} />
            <Route path="/dashboard/superadmin/portal/ai" element={<PortalAi />} />
            <Route path="/dashboard/superadmin/portal/analytics" element={<PortalAnalytics />} />
            <Route path="/dashboard/superadmin/portal/integration" element={<PortalIntegration />} />
            <Route path="/dashboard/superadmin/portal/cloud" element={<PortalCloud />} />
            <Route path="/dashboard/superadmin/portal/web" element={<PortalWeb />} />
            {/* Appointment & Scheduling */}
            <Route path="/dashboard/superadmin/scheduling" element={<SchedulingOverview />} />
            <Route path="/dashboard/superadmin/scheduling/gmpc" element={<GmpcScheduling />} />
            <Route path="/dashboard/superadmin/scheduling/opc" element={<OpcScheduling />} />
            <Route path="/dashboard/superadmin/scheduling/emergency" element={<EmergencyScheduling />} />
            <Route path="/dashboard/superadmin/scheduling/assignment" element={<AssignmentEngine />} />
            <Route path="/dashboard/superadmin/scheduling/calendar" element={<CalendarManagement />} />
            <Route path="/dashboard/superadmin/scheduling/queue" element={<QueueManagement />} />
            <Route path="/dashboard/superadmin/scheduling/telemedicine" element={<TelemedicineScheduling />} />
            <Route path="/dashboard/superadmin/scheduling/reminders" element={<Reminders />} />
            <Route path="/dashboard/superadmin/scheduling/otp" element={<OtpVerification />} />
            <Route path="/dashboard/superadmin/scheduling/payment" element={<PaymentGate />} />
            <Route path="/dashboard/superadmin/scheduling/followup" element={<FollowUpEngine />} />
            <Route path="/dashboard/superadmin/scheduling/confidentiality" element={<SchedConfidentiality />} />
            <Route path="/dashboard/superadmin/scheduling/walkin" element={<WalkIn />} />
            <Route path="/dashboard/superadmin/scheduling/inpatient" element={<InpatientConsults />} />
            <Route path="/dashboard/superadmin/scheduling/analytics" element={<SchedulingAnalytics />} />
            <Route path="/dashboard/superadmin/scheduling/offline" element={<SchedOffline />} />
            <Route path="/dashboard/superadmin/scheduling/mobile" element={<MobileTablet />} />
            <Route path="/dashboard/superadmin/scheduling/integration" element={<HmsIntegration />} />
            <Route path="/dashboard/superadmin/scheduling/ai" element={<AiScheduling />} />
            <Route path="/dashboard/superadmin/scheduling/audit" element={<SchedulingAudit />} />
            <Route path="/dashboard/superadmin/scheduling/cloud" element={<CloudDeployment />} />
            <Route path="/dashboard/superadmin/scheduling/web" element={<WebsiteBridge />} />
            {/* Billing, Wallet & Revenue */}
            <Route path="/dashboard/superadmin/billing" element={<BillingCenterOverview />} />
            <Route path="/dashboard/superadmin/billing/wallet" element={<WalletEngine />} />
            <Route path="/dashboard/superadmin/billing/services" element={<ServiceBilling />} />
            <Route path="/dashboard/superadmin/billing/departments" element={<DepartmentalBilling />} />
            <Route path="/dashboard/superadmin/billing/insurance" element={<InsuranceBilling />} />
            <Route path="/dashboard/superadmin/billing/psychiatry" element={<PsychiatryBilling />} />
            <Route path="/dashboard/superadmin/billing/payments" element={<PaymentProcessing />} />
            <Route path="/dashboard/superadmin/billing/split" element={<SplitBilling />} />
            <Route path="/dashboard/superadmin/billing/invoices" element={<InvoiceManagement />} />
            <Route path="/dashboard/superadmin/billing/refunds" element={<RefundsReversals />} />
            <Route path="/dashboard/superadmin/billing/notes" element={<FinancialNotes />} />
            <Route path="/dashboard/superadmin/billing/tracking" element={<PaymentTracking />} />
            <Route path="/dashboard/superadmin/billing/accommodation" element={<AccommodationBilling />} />
            <Route path="/dashboard/superadmin/billing/receipts" element={<ReceiptGeneration />} />
            <Route path="/dashboard/superadmin/billing/cashier" element={<CashierPos />} />
            <Route path="/dashboard/superadmin/billing/analytics" element={<FinancialAnalytics />} />
            <Route path="/dashboard/superadmin/billing/audit" element={<BillingAudit />} />
            <Route path="/dashboard/superadmin/billing/ai" element={<AiInsights />} />
            <Route path="/dashboard/superadmin/billing/integration" element={<BillingHmsIntegration />} />
            <Route path="/dashboard/superadmin/billing/offline" element={<BillingOffline />} />
            <Route path="/dashboard/superadmin/billing/deployment" element={<EnterpriseDeployment />} />
            {/* Unified EMR Core Engine */}
            <Route path="/dashboard/doctor/emr" element={<EmrOverview />} />
            <Route path="/dashboard/doctor/emr/master" element={<PatientMasterRecord />} />
            <Route path="/dashboard/doctor/emr/timeline" element={<ClinicalTimeline />} />
            <Route path="/dashboard/doctor/emr/doctor" element={<DoctorDocs />} />
            <Route path="/dashboard/doctor/emr/nursing" element={<NursingDocs />} />
            <Route path="/dashboard/doctor/emr/psychology" element={<PsychologyDocs />} />
            <Route path="/dashboard/doctor/emr/pharmacy" element={<PharmacyIntegration />} />
            <Route path="/dashboard/doctor/emr/lab" element={<LabIntegration />} />
            <Route path="/dashboard/doctor/emr/radiology" element={<RadiologyIntegration />} />
            <Route path="/dashboard/doctor/emr/soap" element={<SoapNotes />} />
            <Route path="/dashboard/doctor/emr/care-plans" element={<CarePlans />} />
            <Route path="/dashboard/doctor/emr/consent" element={<ConsentForms />} />
            <Route path="/dashboard/doctor/emr/alerts" element={<ClinicalAlerts />} />
            <Route path="/dashboard/doctor/emr/filters" element={<SmartFilters />} />
            <Route path="/dashboard/doctor/emr/tags" element={<ClinicalTags />} />
            <Route path="/dashboard/doctor/emr/coding" element={<IcdDsm />} />
            <Route path="/dashboard/doctor/emr/ai" element={<AiSummary />} />
            <Route path="/dashboard/doctor/emr/sync" element={<CrossDeptSync />} />
            <Route path="/dashboard/doctor/emr/legacy" element={<LegacyBridge />} />
            <Route path="/dashboard/doctor/emr/notifications" element={<EmrNotifications />} />
            <Route path="/dashboard/doctor/emr/audit" element={<EmrAudit />} />
            <Route path="/dashboard/doctor/emr/mobile" element={<MobileWard />} />
            <Route path="/dashboard/doctor/emr/offline" element={<OfflineCloud />} />
            <Route path="/dashboard/doctor/emr/integration" element={<EmrHmsIntegration />} />
            {/* Doctor Clinical Module */}
            <Route path="/dashboard/doctor/clinical" element={<DocOverview />} />
            <Route path="/dashboard/doctor/clinical/modes" element={<DocModes />} />
            <Route path="/dashboard/doctor/clinical/workspace" element={<DocWorkspace />} />
            <Route path="/dashboard/doctor/clinical/documentation" element={<DocDocumentation />} />
            <Route path="/dashboard/doctor/clinical/timeline" element={<DocTimeline />} />
            <Route path="/dashboard/doctor/clinical/prescriptions" element={<DocPrescriptions />} />
            <Route path="/dashboard/doctor/clinical/lab" element={<DocLab />} />
            <Route path="/dashboard/doctor/clinical/imaging" element={<DocImaging />} />
            <Route path="/dashboard/doctor/clinical/admission" element={<DocAdmission />} />
            <Route path="/dashboard/doctor/clinical/referrals" element={<DocReferrals />} />
            <Route path="/dashboard/doctor/clinical/transfers" element={<DocTransfers />} />
            <Route path="/dashboard/doctor/clinical/active" element={<DocActive />} />
            <Route path="/dashboard/doctor/clinical/ai" element={<DocAi />} />
            <Route path="/dashboard/doctor/clinical/diagnosis" element={<DocDiagnosis />} />
            <Route path="/dashboard/doctor/clinical/ward-round" element={<DocWardRound />} />
            <Route path="/dashboard/doctor/clinical/results" element={<DocResults />} />
            <Route path="/dashboard/doctor/clinical/discharge" element={<DocDischarge />} />
            <Route path="/dashboard/doctor/clinical/emergency" element={<DocEmergency />} />
            <Route path="/dashboard/doctor/clinical/cross-dept" element={<DocCrossDept />} />
            <Route path="/dashboard/doctor/clinical/sync" element={<DocSync />} />
            <Route path="/dashboard/doctor/clinical/mobile" element={<DocMobile />} />
            <Route path="/dashboard/doctor/clinical/audit" element={<DocAudit />} />
            <Route path="/dashboard/doctor/clinical/patients" element={<DoctorPatientDirectory />} />
            <Route path="/dashboard/doctor/clinical/schedule" element={<DoctorMySchedule />} />
            <Route path="/dashboard/doctor/clinical/appointments" element={<DoctorAppointmentMgmt />} />
            <Route path="/dashboard/doctor/clinical/tasks" element={<DoctorTasks />} />
            <Route path="/dashboard/doctor/clinical/comms" element={<DoctorComms />} />
            <Route path="/dashboard/doctor/clinical/cds" element={<DoctorCDS />} />
            <Route path="/dashboard/doctor/clinical/certificates" element={<DoctorCertificates />} />
            <Route path="/dashboard/doctor/clinical/telemedicine" element={<DoctorTelemedicine />} />
            <Route path="/dashboard/doctor/clinical/notifications" element={<DoctorNotifications />} />
            <Route path="/dashboard/doctor/clinical/research" element={<DoctorResearch />} />
            <Route path="/dashboard/doctor/clinical/analytics" element={<DoctorAnalytics />} />
            <Route path="/dashboard/doctor/clinical/profile" element={<DoctorClinicalProfile />} />



            {/* Admin */}
            <Route path="/dashboard/admin" element={<RequireRole roles={ADMIN_OFFICER_ROLES}><AdminOverview /></RequireRole>} />
            <Route path="/dashboard/admin/departments" element={<RequireRole roles={ADMIN_OFFICER_ROLES}><AdminDepartments /></RequireRole>} />
            <Route path="/dashboard/admin/departments/:id" element={<RequireRole roles={ADMIN_OFFICER_ROLES}><AdminDepartments /></RequireRole>} />
            <Route path="/dashboard/admin/invoices" element={<RequireRole roles={ADMIN_OFFICER_ROLES}><InvoicePage /></RequireRole>} />
            <Route path="/dashboard/admin/services" element={<RequireRole roles={ADMIN_OFFICER_ROLES}><ServicesPage /></RequireRole>} />
            <Route path="/dashboard/admin/revenue" element={<RequireRole roles={ADMIN_OFFICER_ROLES}><AdminRevenue /></RequireRole>} />
            <Route path="/dashboard/admin/finance" element={<RequireRole roles={ADMIN_OFFICER_ROLES}><AdminRevenue /></RequireRole>} />
            <Route path="/dashboard/admin/staff" element={<RequireRole roles={ADMIN_OFFICER_ROLES}><AdminStaff /></RequireRole>} />
            <Route path="/dashboard/admin/reports" element={<RequireRole roles={ADMIN_OFFICER_ROLES}><AdminReports /></RequireRole>} />
            <Route path="/dashboard/admin/operations" element={<RequireRole roles={ADMIN_OFFICER_ROLES}><AdminOperations /></RequireRole>} />
            <Route path="/dashboard/admin/inventory" element={<RequireRole roles={ADMIN_OFFICER_ROLES}><AdminInventory /></RequireRole>} />
            <Route path="/dashboard/admin/settings" element={<RequireRole roles={ADMIN_OFFICER_ROLES}><AdminSettings /></RequireRole>} />
            <Route path="/dashboard/admin/packages" element={<RequireRole roles={ADMIN_OFFICER_ROLES}><AdminPackages /></RequireRole>} />
            <Route path="/dashboard/admin/insights" element={<RequireRole roles={ADMIN_OFFICER_ROLES}><AdminInsights /></RequireRole>} />
            {/* Staff */}
            <Route path="/dashboard/staff" element={<StaffDashboard />} />
            <Route path="/dashboard/staff/appointments" element={<StaffAppointments />} />
            <Route path="/dashboard/staff/tasks" element={<StaffTasks />} />
            <Route path="/dashboard/staff/invoices" element={<StaffInvoices />} />
            <Route path="/dashboard/staff/bookings" element={<StaffBookings />} />
            <Route path="/dashboard/staff/attendance" element={<StaffAttendance />} />
            <Route path="/dashboard/staff/leave" element={<StaffLeave />} />
            <Route path="/dashboard/staff/profile" element={<StaffProfile />} />
            {/* Student */}
            <Route path="/dashboard/student" element={<StudentDashboard />} />
            <Route path="/dashboard/student/courses" element={<StudentCourses />} />
            <Route path="/dashboard/student/payments" element={<StudentPayments />} />
            {/* Patient */}
            <Route path="/dashboard/patient" element={<PatientOverview />} />
            <Route path="/dashboard/patient/book" element={<PatientBooking />} />
            <Route path="/dashboard/patient/invoices" element={<PatientInvoices />} />
            <Route path="/dashboard/patient/history" element={<PatientHistory />} />
            <Route path="/dashboard/patient/records" element={<PatientRecords />} />
            <Route path="/dashboard/patient/lab" element={<PatientLab />} />
            <Route path="/dashboard/patient/prescriptions" element={<PatientPrescriptions />} />
            <Route path="/dashboard/patient/notifications" element={<PatientNotifications />} />
            <Route path="/dashboard/patient/profile" element={<PatientProfile />} />
            {/* CMD */}
            <Route path="/dashboard/cmd" element={<CmdOverview />} />
            {/* Board */}
            <Route path="/dashboard/board" element={<BoardOverview />} />
            {/* Finance */}
            <Route path="/dashboard/finance" element={<FinanceOverview />} />
            <Route path="/dashboard/finance/invoices" element={<FinanceInvoices />} />
            <Route path="/dashboard/finance/revenue" element={<FinanceRevenue />} />
            <Route path="/dashboard/finance/payments" element={<FinancePayments />} />
            <Route path="/dashboard/finance/discharge-billing" element={<FinanceDischargeBilling />} />
            <Route path="/dashboard/finance/departments" element={<FinanceDepartments />} />
            <Route path="/dashboard/finance/staff" element={<FinanceStaffRevenue />} />
            <Route path="/dashboard/finance/cashflow" element={<FinanceCashFlow />} />
            <Route path="/dashboard/finance/reports" element={<FinanceReports />} />
            <Route path="/dashboard/finance/attendance" element={<FinanceAttendance />} />
            <Route path="/dashboard/finance/leave" element={<FinanceLeave />} />
            <Route path="/dashboard/finance/profile" element={<FinanceProfile />} />
            {/* HR */}
            <Route path="/dashboard/hr" element={<HrOverview />} />
            <Route path="/dashboard/hr/kpis" element={<HrKpis />} />
            <Route path="/dashboard/hr/staff" element={<HrStaff />} />
            <Route path="/dashboard/hr/recruitment" element={<HrRecruitment />} />
            <Route path="/dashboard/hr/onboarding" element={<HrOnboarding />} />
            <Route path="/dashboard/hr/attendance" element={<HrAttendance />} />
            <Route path="/dashboard/hr/leave" element={<HrLeave />} />
            <Route path="/dashboard/hr/performance" element={<HrPerformance />} />
            <Route path="/dashboard/hr/payroll" element={<HrPayroll />} />
            <Route path="/dashboard/hr/training" element={<HrTraining />} />
            <Route path="/dashboard/hr/compliance" element={<HrCompliance />} />
            <Route path="/dashboard/hr/exit" element={<HrExit />} />
            <Route path="/dashboard/hr/retirement" element={<HrRetirement />} />
            <Route path="/dashboard/hr/alerts" element={<HrAlerts />} />
            <Route path="/dashboard/hr/support" element={<HrSupport />} />
            <Route path="/dashboard/hr/reports" element={<HrReports />} />
            {/* Doctor */}
            <Route path="/dashboard/doctor" element={<DoctorOverview />} />
            <Route path="/dashboard/doctor/appointments" element={<DoctorAppointments />} />
            <Route path="/dashboard/doctor/schedule" element={<DoctorSchedule />} />
            <Route path="/dashboard/doctor/ehealth" element={<DoctorEHealth />} />
            <Route path="/dashboard/doctor/performance" element={<DoctorPerformancePage />} />
            <Route path="/dashboard/doctor/attendance" element={<DoctorAttendance />} />
            <Route path="/dashboard/doctor/profile" element={<DoctorProfile />} />
            {/* IT / Systems */}
            <Route path="/dashboard/it" element={<ItOverview />} />
            <Route path="/dashboard/it/status" element={<ItSystemStatus />} />
            <Route path="/dashboard/it/logs" element={<ItLogs />} />
            <Route path="/dashboard/it/alerts" element={<ItAlerts />} />
            {/* New clinical roles — nursing module (role-guarded) */}
            <Route path="/dashboard/nurse" element={<RequireRole roles={NURSE_ROLES}><NurseDashboard /></RequireRole>} />
            <Route path="/dashboard/nurse/queues" element={<RequireRole roles={NURSE_ROLES}><NursePatientQueues /></RequireRole>} />
            <Route path="/dashboard/nurse/workspace" element={<RequireRole roles={NURSE_ROLES}><NurseWorkspace /></RequireRole>} />
            <Route path="/dashboard/nurse/notes" element={<RequireRole roles={NURSE_ROLES}><NurseNotes /></RequireRole>} />
            <Route path="/dashboard/nurse/vitals" element={<RequireRole roles={NURSE_ROLES}><NurseVitals /></RequireRole>} />
            <Route path="/dashboard/nurse/mar" element={<RequireRole roles={NURSE_ROLES}><NurseMar /></RequireRole>} />
            <Route path="/dashboard/nurse/external-meds" element={<RequireRole roles={NURSE_ROLES}><NurseExternalMeds /></RequireRole>} />
            <Route path="/dashboard/nurse/observation" element={<RequireRole roles={NURSE_ROLES}><NurseObservation /></RequireRole>} />
            <Route path="/dashboard/nurse/icu" element={<RequireRole roles={NURSE_ROLES}><NurseIcu /></RequireRole>} />
            <Route path="/dashboard/nurse/charts" element={<RequireRole roles={NURSE_ROLES}><NurseCharts /></RequireRole>} />
            <Route path="/dashboard/nurse/forms" element={<RequireRole roles={NURSE_ROLES}><NurseForms /></RequireRole>} />
            <Route path="/dashboard/nurse/tasks" element={<RequireRole roles={NURSE_ROLES}><NurseTasks /></RequireRole>} />
            <Route path="/dashboard/nurse/orders" element={<RequireRole roles={NURSE_ROLES}><NurseDoctorOrders /></RequireRole>} />
            <Route path="/dashboard/nurse/samples" element={<RequireRole roles={NURSE_ROLES}><NurseSamples /></RequireRole>} />
            <Route path="/dashboard/nurse/incidents" element={<RequireRole roles={NURSE_ROLES}><NurseIncidents /></RequireRole>} />
            <Route path="/dashboard/nurse/shifts" element={<RequireRole roles={NURSE_ROLES}><NurseShifts /></RequireRole>} />
            <Route path="/dashboard/nurse/handover" element={<RequireRole roles={NURSE_ROLES}><NurseHandover /></RequireRole>} />
            <Route path="/dashboard/nurse/care-plan" element={<RequireRole roles={NURSE_ROLES}><NurseCarePlan /></RequireRole>} />
            <Route path="/dashboard/nurse/admissions" element={<RequireRole roles={NURSE_ROLES}><NurseAdmissions /></RequireRole>} />
            <Route path="/dashboard/nurse/transfers" element={<RequireRole roles={NURSE_ROLES}><NurseTransferQueue /></RequireRole>} />
            <Route path="/dashboard/nurse/referrals" element={<RequireRole roles={NURSE_ROLES}><NurseReferralQueue /></RequireRole>} />
            <Route path="/dashboard/nurse/discharge" element={<RequireRole roles={NURSE_ROLES}><NurseDischarge /></RequireRole>} />
            <Route path="/dashboard/nurse/nok" element={<RequireRole roles={NURSE_ROLES}><NurseNok /></RequireRole>} />
            <Route path="/dashboard/nurse/timeline" element={<RequireRole roles={NURSE_ROLES}><NurseTimeline /></RequireRole>} />
            <Route path="/dashboard/nurse/alerts" element={<RequireRole roles={NURSE_ROLES}><NurseAlerts /></RequireRole>} />
            <Route path="/dashboard/nurse/comms" element={<RequireRole roles={NURSE_ROLES}><NurseComms /></RequireRole>} />
            <Route path="/dashboard/nurse/reports" element={<RequireRole roles={NURSE_ROLES}><NurseReports /></RequireRole>} />
            <Route path="/dashboard/nurse/analytics" element={<RequireRole roles={NURSE_ROLES}><NurseAnalytics /></RequireRole>} />
            <Route path="/dashboard/nurse/mobile" element={<RequireRole roles={NURSE_ROLES}><NurseMobile /></RequireRole>} />
            <Route path="/dashboard/pharmacist" element={<Navigate to="/pharmacy" replace />} />
            
            {/* Cashier Module — payment collection, wallet, refunds, closing, reports */}
            <Route path="/dashboard/cashier" element={<RequireRole roles={CASHIER_ROLES}><CashierDashboard /></RequireRole>} />
            <Route path="/dashboard/cashier/cards" element={<RequireRole roles={CASHIER_ROLES}><NewPatientCardPayments /></RequireRole>} />
            <Route path="/dashboard/cashier/bookings" element={<RequireRole roles={CASHIER_ROLES}><OnlineBookingPayments /></RequireRole>} />
            <Route path="/dashboard/cashier/pharmacy" element={<RequireRole roles={CASHIER_ROLES}><PharmacyWalkInPayments /></RequireRole>} />
            <Route path="/dashboard/cashier/bills" element={<RequireRole roles={CASHIER_ROLES}><BillsPaymentsHub /></RequireRole>} />
            <Route path="/dashboard/cashier/pay" element={<Navigate to="/dashboard/cashier/bills?tab=invoice" replace />} />
            <Route path="/dashboard/cashier/pending" element={<Navigate to="/dashboard/cashier/bills?tab=pending" replace />} />
            <Route path="/dashboard/cashier/paid" element={<Navigate to="/dashboard/cashier/bills?tab=paid" replace />} />
            <Route path="/dashboard/cashier/part" element={<Navigate to="/dashboard/cashier/bills?tab=part" replace />} />
            <Route path="/dashboard/cashier/search" element={<RequireRole roles={CASHIER_ROLES}><PatientPaymentSearch /></RequireRole>} />
            <Route path="/dashboard/cashier/wallet" element={<RequireRole roles={CASHIER_ROLES}><PatientWallet /></RequireRole>} />
            <Route path="/dashboard/cashier/refunds" element={<RequireRole roles={CASHIER_ROLES}><CashierRefunds /></RequireRole>} />
            <Route path="/dashboard/cashier/discounts" element={<RequireRole roles={CASHIER_ROLES}><DiscountsWaivers /></RequireRole>} />
            <Route path="/dashboard/cashier/copay" element={<RequireRole roles={CASHIER_ROLES}><NhisHmoCopay /></RequireRole>} />
            <Route path="/dashboard/cashier/confirm" element={<RequireRole roles={CASHIER_ROLES}><PosTransferConfirm /></RequireRole>} />
            <Route path="/dashboard/cashier/closing" element={<RequireRole roles={CASHIER_ROLES}><DailyClosing /></RequireRole>} />
            <Route path="/dashboard/cashier/reports" element={<RequireRole roles={CASHIER_ROLES}><CashierReports /></RequireRole>} />
            <Route path="/dashboard/cashier/verify" element={<RequireRole roles={CASHIER_ROLES}><ReceiptVerification /></RequireRole>} />
            <Route path="/dashboard/cashier/audit" element={<RequireRole roles={CASHIER_ROLES}><CashierAuditTrail /></RequireRole>} />
            <Route path="/dashboard/cashier/settings" element={<RequireRole roles={CASHIER_ROLES}><CashierSettings /></RequireRole>} />
            <Route path="/dashboard/cashier/profile" element={<RequireRole roles={CASHIER_ROLES}><CashierProfile /></RequireRole>} />
            <Route path="/dashboard/cashier/comms" element={<RequireRole roles={CASHIER_ROLES}><CashierComms /></RequireRole>} />
            <Route path="/dashboard/records" element={<RecordsOverview />} />
            {/* HMS modules (shared, sidebar adapts to current role) */}
            <Route path="/hms/patients" element={<PatientManagement />} />
            <Route path="/hms/identity" element={<PatientIdentityEngine />} />
            <Route path="/hms/duplicates" element={<DuplicateReviewQueue />} />
            {/* Legacy /hms/billing routes redirect to canonical /billing/* */}
            <Route path="/hms/billing" element={<Navigate to="/billing" replace />} />
            <Route path="/hms/billing/invoices" element={<Navigate to="/billing/visits" replace />} />
            <Route path="/hms/billing/sms" element={<Navigate to="/billing/channels" replace />} />
            <Route path="/hms/lab" element={<LaboratoryModule />} />
            <Route path="/hms/lab/samples" element={<LaboratoryModule />} />
            <Route path="/hms/pharmacy" element={<PharmacyModule />} />
            <Route path="/hms/pharmacy/stock" element={<PharmacyStock />} />
            <Route path="/hms/ipd" element={<IpdModule />} />
            <Route path="/hms/admissions" element={<AdmissionsModule />} />
            <Route path="/hms/discharge" element={<DischargeModule />} />
            <Route path="/hms/sync" element={<SyncModule />} />
            <Route path="/hms/audit" element={<AuditModule />} />
            {/* Records Department screens */}
            <Route path="/records/triage" element={<TriageQueue />} />
            <Route path="/records/admissions" element={<RecordsAdmissionRequests />} />
            <Route path="/records/transfers" element={<RecordsTransfersLive />} />
            <Route path="/records/discharge" element={<RecordsDischargeLive />} />
            <Route path="/records/directory" element={<PatientDirectory />} />
            <Route path="/records/patient-directory/:patientId/history" element={<PatientHistoryPage />} />
            <Route path="/records/patient-directory/:patientId/documents" element={<PatientDocumentsPage />} />
            <Route path="/records/patient-directory/:patientId/profile" element={<PatientProfilePage />} />
            <Route path="/records/documents" element={<DocumentManagement />} />
            <Route path="/records/reports" element={<DailyReports />} />
            <Route path="/records/audit" element={<RecordsAuditTrail />} />
            <Route path="/records/analytics" element={<RecordsAnalytics />} />
            <Route path="/records/sync" element={<SyncModule />} />
            <Route path="/records/sync-queue" element={<SyncModule />} />
            <Route path="/records/checkin" element={<AppointmentCheckIn />} />
            <Route path="/records/arrivals" element={<PatientArrival />} />
            <Route path="/records/duplicates" element={<DuplicatePatientManagement />} />
            <Route path="/records/retrieval" element={<MedicalRecordRetrieval />} />
            <Route path="/records/archive" element={<RecordArchive />} />
            <Route path="/records/referrals" element={<RecordsReferralsLive />} />
            <Route path="/records/comms" element={<RequireRole roles={['superadmin','admin','cmd','records']}><RecordsComms /></RequireRole>} />
            <Route path="/records/profile" element={<RequireRole roles={['superadmin','admin','cmd','records']}><RecordsProfile /></RequireRole>} />

            {/* Billing Initiation System — RBAC: superadmin, admin, cmd, finance, cashier */}
            <Route path="/billing" element={<RequireRole roles={['superadmin','admin','cmd','finance','cashier','records']}><BillingOverview /></RequireRole>} />
            <Route path="/billing/visits" element={<RequireRole roles={['superadmin','admin','cmd','finance','cashier','records']}><VisitsInvoices /></RequireRole>} />
            <Route path="/billing/channels" element={<RequireRole roles={['superadmin','admin','cmd','finance','cashier','records']}><MultiChannelPay /></RequireRole>} />
            <Route path="/billing/pos" element={<RequireRole roles={['superadmin','cashier','finance','records']}><PosTerminal /></RequireRole>} />
            <Route path="/billing/reconciliation" element={<RequireRole roles={['superadmin','admin','cmd','finance']}><ReconciliationEngine /></RequireRole>} />
            <Route path="/billing/gate" element={<RequireRole roles={['superadmin','admin','cmd','finance','cashier','doctor','records']}><ConsultationGate /></RequireRole>} />
            <Route path="/billing/audit" element={<RequireRole roles={['superadmin','admin','cmd','finance','cashier','records']}><BillingAuditTrail /></RequireRole>} />
            {/* Doctor Consultation Module */}
            <Route path="/consultation/queue" element={<RequireRole roles={['superadmin','admin','cmd','doctor','nurse']}><ConsultationQueue /></RequireRole>} />
            <Route path="/consultation/active" element={<RequireRole roles={['superadmin','admin','cmd','doctor','nurse']}><ActiveConsultations /></RequireRole>} />
            <Route path="/consultation/completed" element={<RequireRole roles={['superadmin','admin','cmd','doctor','nurse']}><CompletedConsultations /></RequireRole>} />
            <Route path="/consultation/sync" element={<RequireRole roles={['superadmin','admin','cmd','doctor','it']}><ConsultationSyncQueue /></RequireRole>} />
            <Route path="/consultation/visit/:visitCode" element={<RequireRole roles={['superadmin','admin','cmd','doctor','nurse']}><ConsultationWorkspace /></RequireRole>} />
            {/* Comprehensive Laboratory Module */}
            <Route path="/lab" element={<LabDashboard />} />
            <Route path="/lab/requests" element={<LabRequestsList />} />
            <Route path="/lab/samples" element={<LabSampleCollection />} />
            <Route path="/lab/processing" element={<LabProcessing />} />
            <Route path="/lab/results" element={<LabResultEntry />} />
            <Route path="/lab/verification" element={<LabVerification />} />
            <Route path="/lab/released" element={<LabReleased />} />
            <Route path="/lab/sync" element={<LabSyncQueue />} />
            <Route path="/lab/catalog" element={<LabCatalog />} />
            <Route path="/lab/audit" element={<LabAudit />} />
            <Route path="/lab/request/:id" element={<LabRequestDetail />} />
            {/* Comprehensive Pharmacy Module */}
            <Route path="/pharmacy" element={<PharmacyDashboard />} />
            <Route path="/pharmacy/queue" element={<PharmacyQueue />} />
            <Route path="/pharmacy/review" element={<PharmacyReview />} />
            <Route path="/pharmacy/dispense" element={<PharmacyDispense />} />
            <Route path="/pharmacy/completed" element={<PharmacyCompleted />} />
            <Route path="/pharmacy/inventory" element={<PharmacyInventory />} />
            <Route path="/pharmacy/movements" element={<PharmacyMovements />} />
            <Route path="/pharmacy/sync" element={<PharmacySyncQueue />} />
            <Route path="/pharmacy/audit" element={<PharmacyAudit />} />
            <Route path="/pharmacy/rx/:id" element={<PharmacyRxDetail />} />
            <Route path="/pharmacy/procurement" element={<PharmacyProcurement />} />
            <Route path="/pharmacy/drugs" element={<PharmacyDrugCatalog />} />
            {/* Comprehensive IPD / Admission Module */}
            <Route path="/ipd" element={<IpdDashboard />} />
            <Route path="/ipd/requests" element={<AdmissionRequests />} />
            <Route path="/ipd/beds" element={<BedBoard />} />
            <Route path="/ipd/active" element={<ActiveAdmissions />} />
            <Route path="/ipd/care" element={<DailyCare />} />
            <Route path="/ipd/billing" element={<ContinuousBilling />} />
            <Route path="/ipd/transfers" element={<TransfersPage />} />
            <Route path="/ipd/long-stay" element={<LongStayAlerts />} />
            <Route path="/ipd/discharge" element={<DischargeQueue />} />
            <Route path="/ipd/sync" element={<IpdSyncPage />} />
            <Route path="/ipd/admission/:id" element={<AdmissionDetail />} />
            {/* Final Billing & Discharge Module */}
            <Route path="/discharge" element={<DischargeDashboard />} />
            <Route path="/discharge/queue" element={<DischargeQueuePage />} />
            <Route path="/discharge/aggregate" element={<BillAggregation />} />
            <Route path="/discharge/validation" element={<ValidationFlags />} />
            <Route path="/discharge/payments" element={<PaymentCollection />} />
            <Route path="/discharge/finance" element={<FinanceClearance />} />
            <Route path="/discharge/beds" element={<BedReleasePage />} />
            <Route path="/discharge/summaries" element={<DischargeSummaries />} />
            <Route path="/discharge/sync" element={<DischargeEmrSync />} />
            <Route path="/discharge/disputes" element={<DischargeDisputes />} />
            <Route path="/discharge/audit" element={<DischargeAuditTrail />} />
            <Route path="/discharge/case/:id" element={<DischargeCaseDetail />} />
            {/* Phase 10 — Admission, Ward, Bed Management */}
            <Route path="/dashboard/admission" element={<AdmissionDashboard />} />
            <Route path="/dashboard/admission/wizard" element={<AdmissionWizard />} />
            <Route path="/dashboard/admission/wards" element={<WardManagement />} />
            <Route path="/dashboard/admission/beds" element={<BedManagement />} />
            <Route path="/dashboard/admission/movement" element={<PatientMovementCenter />} />
            <Route path="/dashboard/admission/transfer" element={<TransferCenter />} />
            <Route path="/dashboard/admission/accommodation" element={<AccommodationCenter />} />
            <Route path="/dashboard/admission/discharge" element={<DischargeWorkspace />} />
            <Route path="/dashboard/admission/trial-leave" element={<TrialLeaveModule />} />
            <Route path="/dashboard/admission/dama" element={<DamaModule />} />
            <Route path="/dashboard/admission/referrals" element={<ReferralCenter />} />
            <Route path="/dashboard/admission/care-team" element={<CareTeamCenter />} />
            <Route path="/dashboard/admission/ward-round" element={<WardRoundCenter />} />
            <Route path="/dashboard/admission/reports" element={<AdmReportingCenter />} />
            <Route path="/dashboard/admission/analytics" element={<AdmAnalyticsCenter />} />
            <Route path="/dashboard/admission/comms" element={<AdmCommsCenter />} />
            <Route path="/dashboard/admission/mobile" element={<MobileBedside />} />
            <Route path="/dashboard/admission/config" element={<WardBedConfig />} />
            {/* Enterprise Laboratory Center */}
            <Route path="/dashboard/laboratory" element={<RequireRole roles={['superadmin','admin','lab','doctor','nurse','cmd']}><LabCenterDashboard /></RequireRole>} />
            <Route path="/dashboard/laboratory/requests" element={<RequireRole roles={['superadmin','admin','lab','doctor','nurse','cmd']}><LabRequestCenter /></RequireRole>} />
            <Route path="/dashboard/laboratory/billing" element={<RequireRole roles={['superadmin','admin','lab','cashier','finance','cmd']}><LabBillingInterface /></RequireRole>} />
            <Route path="/dashboard/laboratory/walk-in" element={<RequireRole roles={['superadmin','admin','lab','doctor','nurse','cmd']}><LabWalkInWorkflow /></RequireRole>} />
            <Route path="/dashboard/laboratory/samples" element={<RequireRole roles={['superadmin','admin','lab','cmd']}><LabSamplesPage /></RequireRole>} />
            <Route path="/dashboard/laboratory/results" element={<RequireRole roles={['superadmin','admin','lab','cmd']}><LabResultsPage /></RequireRole>} />
            <Route path="/dashboard/laboratory/validation" element={<RequireRole roles={['superadmin','admin','lab','cmd']}><LabValidationPage /></RequireRole>} />
            <Route path="/dashboard/laboratory/amendment" element={<RequireRole roles={['superadmin','admin','lab','cmd']}><LabAmendmentPage /></RequireRole>} />
            <Route path="/dashboard/laboratory/templates" element={<RequireRole roles={['superadmin','admin','lab','cmd']}><LabTemplatesPage /></RequireRole>} />
            <Route path="/dashboard/laboratory/drug-screen" element={<RequireRole roles={['superadmin','admin','lab','cmd']}><LabDrugScreen /></RequireRole>} />
            <Route path="/dashboard/laboratory/culture" element={<RequireRole roles={['superadmin','admin','lab','cmd']}><LabCulture /></RequireRole>} />
            <Route path="/dashboard/laboratory/sfa" element={<RequireRole roles={['superadmin','admin','lab','cmd']}><LabSfa /></RequireRole>} />
            <Route path="/dashboard/laboratory/blood-bank" element={<RequireRole roles={['superadmin','admin','lab','cmd']}><LabBloodBank /></RequireRole>} />
            <Route path="/dashboard/laboratory/history" element={<RequireRole roles={['superadmin','admin','lab','doctor','nurse','cmd']}><LabHistoryCenter /></RequireRole>} />
            <Route path="/dashboard/laboratory/all-results" element={<LabAllResults />} />
            <Route path="/dashboard/laboratory/print" element={<LabPrintCenter />} />
            <Route path="/dashboard/laboratory/comms" element={<LabComms />} />
            <Route path="/dashboard/laboratory/reports" element={<RequireRole roles={['superadmin','admin','lab','cmd']}><LabReports /></RequireRole>} />
            <Route path="/dashboard/laboratory/analytics" element={<RequireRole roles={['superadmin','admin','lab','cmd']}><LabAnalytics /></RequireRole>} />
            <Route path="/dashboard/laboratory/alerts" element={<LabAlerts />} />
            <Route path="/dashboard/laboratory/mobile" element={<LabMobile />} />
            <Route path="/dashboard/laboratory/config" element={<RequireRole roles={['superadmin','admin','lab','cmd']}><LabConfig /></RequireRole>} />
            <Route path="/dashboard/laboratory/profile" element={<RequireRole roles={['superadmin','admin','lab','cmd']}><LabProfile /></RequireRole>} />
            <Route path="/dashboard/laboratory/specimens" element={<RequireRole roles={['superadmin','admin','lab','cmd']}><SpecimenTrackingCenter /></RequireRole>} />
            <Route path="/dashboard/laboratory/microbiology" element={<RequireRole roles={['superadmin','admin','lab','cmd']}><MicrobiologyWorkbench /></RequireRole>} />
            <Route path="/dashboard/laboratory/histopathology" element={<RequireRole roles={['superadmin','admin','lab','cmd']}><HistopathologyCenter /></RequireRole>} />
            <Route path="/dashboard/laboratory/qc" element={<RequireRole roles={['superadmin','admin','lab','cmd']}><QualityControlCenter /></RequireRole>} />
            <Route path="/dashboard/pharmacy" element={<PharmacyCenterDashboard />} />
            <Route path="/dashboard/pharmacy/queue" element={<PharmacyQueueCenter />} />
            <Route path="/dashboard/pharmacy/dispense" element={<PharmacyDispenseWorkspace />} />
            <Route path="/dashboard/pharmacy/reconciliation" element={<PharmacyReconciliationCenter />} />
            <Route path="/dashboard/pharmacy/external" element={<PharmacyExternalMeds />} />
            <Route path="/dashboard/pharmacy/inventory" element={<PharmacyInventoryCenter />} />
            <Route path="/dashboard/pharmacy/movements" element={<PharmacyMovementCenter />} />
            <Route path="/dashboard/pharmacy/expiry" element={<PharmacyExpiryCenter />} />
            <Route path="/pharmacy/forecast" element={<PharmacyForecastCenter />} />
            <Route path="/pharmacy/interactions" element={<RequireRole roles={['superadmin','admin','cmd','pharmacist']}><PharmacyInteractionCenter /></RequireRole>} />
            <Route path="/dashboard/pharmacy/controlled" element={<PharmacyControlledRegister />} />
            <Route path="/pharmacy/inpatient" element={<PharmacyInpatientCenter />} />
            <Route path="/dashboard/pharmacy/nhia" element={<PharmacyNhiaCenter />} />
            <Route path="/pharmacy/billing" element={<PharmacyBillingCenter />} />
            <Route path="/pharmacy/returns" element={<PharmacyReturnsCenter />} />
            <Route path="/dashboard/pharmacy/dispense-recon" element={<PharmacyDispenseReconciliation />} />
            <Route path="/dashboard/pharmacy/timeline" element={<PharmacyTimelineCenter />} />
            <Route path="/pharmacy/reports" element={<PharmacyReportsCenter />} />
            <Route path="/pharmacy/analytics" element={<PharmacyAnalyticsCenter />} />
            <Route path="/dashboard/pharmacy/comms" element={<PharmacyCommsCenter />} />
            <Route path="/dashboard/pharmacy/mobile" element={<PharmacyMobileMode />} />
            <Route path="/pharmacy/config" element={<PharmacyConfigCenter />} />
            <Route path="/pharmacy/profile" element={<RequireRole roles={['superadmin','admin','cmd','pharmacist']}><PharmacyProfile /></RequireRole>} />
            <Route path="/dashboard/pharmacy/profile" element={<RequireRole roles={['superadmin','admin','cmd','pharmacist']}><PharmacyProfile /></RequireRole>} />
            {/* Radiology & ECG (RIS) — RBAC: superadmin, admin, cmd, radiology, radiologist, doctor */}
            <Route path="/dashboard/radiology" element={<RequireRole roles={RAD_REPORTING_ROLES}><RadiologyDashboard /></RequireRole>} />
            <Route path="/dashboard/radiology/request" element={<RequireRole roles={RAD_REPORTING_ROLES}><ImagingRequestCenter /></RequireRole>} />
            <Route path="/dashboard/radiology/queue" element={<RequireRole roles={RAD_REPORTING_ROLES}><RadiologyRequestQueue /></RequireRole>} />
            <Route path="/dashboard/radiology/schedule" element={<RequireRole roles={RAD_TECH_ROLES}><ImagingScheduling /></RequireRole>} />
            <Route path="/dashboard/radiology/preparation" element={<RequireRole roles={RAD_TECH_ROLES}><PatientPreparation /></RequireRole>} />
            <Route path="/dashboard/radiology/exam" element={<RequireRole roles={RAD_TECH_ROLES}><ExaminationRoom /></RequireRole>} />
            <Route path="/dashboard/radiology/pacs" element={<RequireRole roles={RAD_REPORTING_ROLES}><PacsViewer /></RequireRole>} />
            <Route path="/dashboard/radiology/upload" element={<RequireRole roles={RAD_TECH_ROLES}><ImageUploadCenter /></RequireRole>} />
            <Route path="/dashboard/radiology/report" element={<RequireRole roles={RAD_REPORTING_ROLES}><RadiologyReportEntry /></RequireRole>} />
            <Route path="/dashboard/radiology/validation" element={<RequireRole roles={RAD_REPORTING_ROLES}><RadiologyValidation /></RequireRole>} />
            <Route path="/dashboard/radiology/critical" element={<RequireRole roles={RAD_REPORTING_ROLES}><CriticalFindings /></RequireRole>} />
            <Route path="/dashboard/radiology/release" element={<RequireRole roles={RAD_REPORTING_ROLES}><ResultRelease /></RequireRole>} />
            <Route path="/dashboard/radiology/ecg" element={<RequireRole roles={RAD_REPORTING_ROLES}><EcgReporting /></RequireRole>} />
            <Route path="/dashboard/radiology/eeg" element={<RequireRole roles={RAD_REPORTING_ROLES}><EegReporting /></RequireRole>} />
            <Route path="/dashboard/radiology/history" element={<RequireRole roles={RAD_REPORTING_ROLES}><RadiologyHistory /></RequireRole>} />
            <Route path="/dashboard/radiology/all-results" element={<RequireRole roles={RAD_REPORTING_ROLES}><AllImagingResults /></RequireRole>} />
            <Route path="/dashboard/radiology/archive" element={<RequireRole roles={RAD_REPORTING_ROLES}><ImageArchive /></RequireRole>} />
            <Route path="/dashboard/radiology/print" element={<RequireRole roles={RAD_REPORTING_ROLES}><RadiologyPrintCenter /></RequireRole>} />
            <Route path="/dashboard/radiology/billing" element={<RequireRole roles={['superadmin','admin','cmd','radiology','cashier','finance']}><RadiologyBilling /></RequireRole>} />
            <Route path="/dashboard/radiology/equipment" element={<RequireRole roles={RAD_ADMIN_ROLES}><RadiologyEquipment /></RequireRole>} />
            <Route path="/dashboard/radiology/consumables" element={<RequireRole roles={RAD_ADMIN_ROLES}><RadiologyConsumables /></RequireRole>} />
            <Route path="/dashboard/radiology/forms" element={<RequireRole roles={RAD_TECH_ROLES}><RadiologyForms /></RequireRole>} />
            <Route path="/dashboard/radiology/ai" element={<RequireRole roles={RAD_REPORTING_ROLES}><AiAssistant /></RequireRole>} />
            <Route path="/dashboard/radiology/comms" element={<RequireRole roles={RAD_REPORTING_ROLES}><RadiologyComms /></RequireRole>} />
            <Route path="/dashboard/radiology/reports" element={<RequireRole roles={RAD_REPORTING_ROLES}><RadiologyReports /></RequireRole>} />
            <Route path="/dashboard/radiology/analytics" element={<RequireRole roles={RAD_ADMIN_ROLES}><RadiologyAnalytics /></RequireRole>} />
            <Route path="/dashboard/radiology/alerts" element={<RequireRole roles={RAD_REPORTING_ROLES}><RadiologyAlerts /></RequireRole>} />
            <Route path="/dashboard/radiology/mobile" element={<RequireRole roles={RAD_REPORTING_ROLES}><RadiologyMobile /></RequireRole>} />
            <Route path="/dashboard/radiology/audit" element={<RequireRole roles={RAD_ADMIN_ROLES}><RadiologyAuditTrail /></RequireRole>} />
            <Route path="/dashboard/radiology/config" element={<RequireRole roles={RAD_ADMIN_ROLES}><RadiologyConfig /></RequireRole>} />
            {/* Psychiatric OPC — outpatient clinic, queue, assessments, MSE, diagnosis, orders, risk, admission, referrals */}
            <Route path="/dashboard/psychopc" element={<RequireRole roles={OPC_ROLES}><PsychOpcDashboard /></RequireRole>} />
            <Route path="/dashboard/psychopc/queue" element={<RequireRole roles={OPC_ROLES}><PsychOpcQueue /></RequireRole>} />
            <Route path="/dashboard/psychopc/consult" element={<RequireRole roles={OPC_ROLES}><PsychOpcConsultation /></RequireRole>} />
            <Route path="/dashboard/psychopc/assessment" element={<RequireRole roles={OPC_ROLES}><PsychOpcAssessment /></RequireRole>} />
            <Route path="/dashboard/psychopc/mse" element={<RequireRole roles={OPC_ROLES}><PsychOpcMse /></RequireRole>} />
            <Route path="/dashboard/psychopc/diagnosis" element={<RequireRole roles={OPC_ROLES}><PsychOpcDiagnosis /></RequireRole>} />
            <Route path="/dashboard/psychopc/prescriptions" element={<RequireRole roles={OPC_ROLES}><PsychOpcPrescriptions /></RequireRole>} />
            <Route path="/dashboard/psychopc/investigations" element={<RequireRole roles={OPC_ROLES}><PsychOpcInvestigations /></RequireRole>} />
            <Route path="/dashboard/psychopc/risk" element={<RequireRole roles={OPC_ROLES}><PsychOpcRisk /></RequireRole>} />
            <Route path="/dashboard/psychopc/admission" element={<RequireRole roles={OPC_ROLES}><PsychOpcAdmission /></RequireRole>} />
            <Route path="/dashboard/psychopc/appointments" element={<RequireRole roles={OPC_ROLES}><PsychOpcAppointments /></RequireRole>} />
            <Route path="/dashboard/psychopc/psychology" element={<RequireRole roles={OPC_ROLES}><PsychOpcPsychology /></RequireRole>} />
            <Route path="/dashboard/psychopc/welfare" element={<RequireRole roles={OPC_ROLES}><PsychOpcWelfare /></RequireRole>} />
            <Route path="/dashboard/psychopc/emergency" element={<RequireRole roles={OPC_ROLES}><PsychOpcEmergency /></RequireRole>} />
            <Route path="/dashboard/psychopc/reports" element={<RequireRole roles={OPC_ROLES}><PsychOpcReports /></RequireRole>} />
            <Route path="/dashboard/psychopc/settings" element={<RequireRole roles={OPC_ROLES}><PsychOpcSettings /></RequireRole>} />
            {/* Clinical Psychology */}
            <Route path="/dashboard/psychology" element={<PsychologyDashboard />} />
            <Route path="/dashboard/psychology/assessments" element={<AssessmentCenter />} />
            <Route path="/dashboard/psychology/iq" element={<IqAssessment />} />
            <Route path="/dashboard/psychology/personality" element={<PersonalityAssessment />} />
            <Route path="/dashboard/psychology/therapy" element={<TherapyManagement />} />
            <Route path="/dashboard/psychology/satsat" element={<SatsatProgram />} />
            <Route path="/dashboard/psychology/documentation" element={<DocumentationCenter />} />
            <Route path="/dashboard/psychology/treatment-plans" element={<TreatmentPlans />} />
            <Route path="/dashboard/psychology/referrals" element={<ReferralManagement />} />
            <Route path="/dashboard/psychology/scheduling" element={<SessionScheduling />} />
            <Route path="/dashboard/psychology/outcomes" element={<OutcomeMonitoring />} />
            <Route path="/dashboard/psychology/billing" element={<PsychologyBilling />} />
            <Route path="/dashboard/psychology/nhia" element={<NhiaMapping />} />
            <Route path="/dashboard/psychology/reports" element={<PsychologyReports />} />
            <Route path="/dashboard/psychology/research" element={<ResearchStatistics />} />
            <Route path="/dashboard/psychology/comms" element={<PsyCommsCenter />} />
            <Route path="/dashboard/psychology/onboarding" element={<StaffOnboarding />} />
            <Route path="/dashboard/psychology/alerts" element={<PsychologyAlerts />} />
            <Route path="/dashboard/psychology/mobile" element={<PsychologyMobile />} />
            <Route path="/dashboard/psychology/config" element={<PsychologyConfig />} />
            {/* Child & Adolescent Psychiatry */}
            <Route path="/dashboard/cap" element={<CapDashboard />} />
            <Route path="/dashboard/cap/registration" element={<ChildRegistration />} />
            <Route path="/dashboard/cap/assessments" element={<CapAssessmentCenter />} />
            <Route path="/dashboard/cap/development" element={<DevelopmentTracking />} />
            <Route path="/dashboard/cap/autism" element={<AutismCenter />} />
            <Route path="/dashboard/cap/adhd" element={<AdhdCenter />} />
            <Route path="/dashboard/cap/safeguarding" element={<SafeguardingCenter />} />
            <Route path="/dashboard/cap/family" element={<FamilyCounselling />} />
            <Route path="/dashboard/cap/school" element={<SchoolServices />} />
            <Route path="/dashboard/cap/mdt" element={<MdtCollaboration />} />
            <Route path="/dashboard/cap/therapy" element={<CapTherapyManagement />} />
            <Route path="/dashboard/cap/medications" element={<MedicationCenter />} />
            <Route path="/dashboard/cap/followup" element={<FollowUpDashboard />} />
            <Route path="/dashboard/cap/billing" element={<CapBilling />} />
            <Route path="/dashboard/cap/research" element={<CapResearchStatistics />} />
            <Route path="/dashboard/cap/reports" element={<CapReportingCenter />} />
            <Route path="/dashboard/cap/comms" element={<CapCommsCenter />} />
            <Route path="/dashboard/cap/alerts" element={<CapAlerts />} />
            <Route path="/dashboard/cap/mobile" element={<CapMobile />} />
            <Route path="/dashboard/cap/config" element={<CapConfig />} />
            {/* Addiction Services & Rehabilitation */}
            <Route path="/dashboard/addiction" element={<AddictionDashboard />} />
            <Route path="/dashboard/addiction/assessments" element={<AddictionAssessmentCenter />} />
            <Route path="/dashboard/addiction/asi" element={<AsiCenter />} />
            <Route path="/dashboard/addiction/detox" element={<DetoxManagement />} />
            <Route path="/dashboard/addiction/rehab" element={<RehabilitationCenter />} />
            <Route path="/dashboard/addiction/screening" element={<DrugScreening />} />
            <Route path="/dashboard/addiction/therapy" element={<AdxTherapy />} />
            <Route path="/dashboard/addiction/family" element={<FamilyInvolvement />} />
            <Route path="/dashboard/addiction/occupational" element={<OccupationalRehab />} />
            <Route path="/dashboard/addiction/relapse" element={<RelapsePrevention />} />
            <Route path="/dashboard/addiction/community" element={<CommunityReintegration />} />
            <Route path="/dashboard/addiction/inpatient" element={<InpatientRehab />} />
            <Route path="/dashboard/addiction/discharge" element={<DischargeAftercare />} />
            <Route path="/dashboard/addiction/followup" element={<AdxFollowUp />} />
            <Route path="/dashboard/addiction/billing" element={<AddictionBilling />} />
            <Route path="/dashboard/addiction/research" element={<AdxResearch />} />
            <Route path="/dashboard/addiction/reports" element={<AdxReports />} />
            <Route path="/dashboard/addiction/comms" element={<AdxComms />} />
            <Route path="/dashboard/addiction/alerts" element={<AddictionAlerts />} />
            <Route path="/dashboard/addiction/mobile" element={<AddictionMobile />} />
            <Route path="/dashboard/addiction/config" element={<AddictionConfig />} />
            {/* Psychogeriatric Services */}
            <Route path="/dashboard/psychogeriatrics" element={<PsychogeriatricsDashboard />} />
            <Route path="/dashboard/psychogeriatrics/registry" element={<ElderlyRegistry />} />
            <Route path="/dashboard/psychogeriatrics/memory" element={<MemoryClinic />} />
            <Route path="/dashboard/psychogeriatrics/cognitive" element={<CognitiveAssessment />} />
            <Route path="/dashboard/psychogeriatrics/functional" element={<FunctionalAssessment />} />
            <Route path="/dashboard/psychogeriatrics/falls" element={<FrailtyFallsCenter />} />
            <Route path="/dashboard/psychogeriatrics/elder-abuse" element={<ElderAbuseScreening />} />
            <Route path="/dashboard/psychogeriatrics/caregivers" element={<CaregiverCenter />} />
            <Route path="/dashboard/psychogeriatrics/medications" element={<MedicationReview />} />
            <Route path="/dashboard/psychogeriatrics/long-term" element={<LongTermCare />} />
            <Route path="/dashboard/psychogeriatrics/home-care" element={<HomeCareCommunity />} />
            <Route path="/dashboard/psychogeriatrics/family" element={<FamilySupport />} />
            <Route path="/dashboard/psychogeriatrics/inpatient" element={<InpatientPsychogeriatrics />} />
            <Route path="/dashboard/psychogeriatrics/followup" element={<FollowUpManagement />} />
            <Route path="/dashboard/psychogeriatrics/billing" element={<PsychogeriatricsBilling />} />
            <Route path="/dashboard/psychogeriatrics/research" element={<PsychogeriatricsResearch />} />
            <Route path="/dashboard/psychogeriatrics/reports" element={<PsychogeriatricsReports />} />
            <Route path="/dashboard/psychogeriatrics/comms" element={<PsychogeriatricsComms />} />
            <Route path="/dashboard/psychogeriatrics/alerts" element={<PsychogeriatricsAlerts />} />
            <Route path="/dashboard/psychogeriatrics/mobile" element={<PsychogeriatricsMobile />} />
            <Route path="/dashboard/psychogeriatrics/config" element={<PsychogeriatricsConfig />} />
            {/* Physiotherapy */}
            <Route path="/dashboard/physiotherapy" element={<PhysiotherapyDashboard />} />
            <Route path="/dashboard/physiotherapy/referrals" element={<PhysioReferralCenter />} />
            <Route path="/dashboard/physiotherapy/assessments" element={<PhysioAssessmentCenter />} />
            <Route path="/dashboard/physiotherapy/mobility" element={<MobilityAssessment />} />
            <Route path="/dashboard/physiotherapy/falls" element={<FallsPrevention />} />
            <Route path="/dashboard/physiotherapy/plans" element={<PhysioTreatmentPlans />} />
            <Route path="/dashboard/physiotherapy/exercises" element={<ExercisePrescription />} />
            <Route path="/dashboard/physiotherapy/sessions" element={<PhysioTherapySessions />} />
            <Route path="/dashboard/physiotherapy/neuro" element={<NeuroRehab />} />
            <Route path="/dashboard/physiotherapy/psych-rehab" element={<PsychiatricRehab />} />
            <Route path="/dashboard/physiotherapy/child" element={<ChildPhysio />} />
            <Route path="/dashboard/physiotherapy/geriatric" element={<GeriatricPhysio />} />
            <Route path="/dashboard/physiotherapy/addiction" element={<AddictionPhysio />} />
            <Route path="/dashboard/physiotherapy/devices" element={<AssistiveDevices />} />
            <Route path="/dashboard/physiotherapy/inpatient" element={<InpatientPhysio />} />
            <Route path="/dashboard/physiotherapy/outpatient" element={<OutpatientPhysio />} />
            <Route path="/dashboard/physiotherapy/followup" element={<PhysioFollowUp />} />
            <Route path="/dashboard/physiotherapy/billing" element={<PhysiotherapyBilling />} />
            <Route path="/dashboard/physiotherapy/research" element={<PhysiotherapyResearch />} />
            <Route path="/dashboard/physiotherapy/reports" element={<PhysiotherapyReports />} />
            <Route path="/dashboard/physiotherapy/comms" element={<PhysiotherapyComms />} />
            <Route path="/dashboard/physiotherapy/alerts" element={<PhysiotherapyAlerts />} />
            <Route path="/dashboard/physiotherapy/mobile" element={<PhysiotherapyMobile />} />
            <Route path="/dashboard/physiotherapy/config" element={<PhysiotherapyConfig />} />
            {/* Speech Therapy */}
            <Route path="/dashboard/speech" element={<SpeechTherapyDashboard />} />
            <Route path="/dashboard/speech/referrals" element={<SpeechReferralCenter />} />
            <Route path="/dashboard/speech/assessments" element={<SpeechAssessmentCenter />} />
            <Route path="/dashboard/speech/speech-disorders" element={<SpeechDisorders />} />
            <Route path="/dashboard/speech/language-disorders" element={<LanguageDisorders />} />
            <Route path="/dashboard/speech/voice-fluency" element={<VoiceFluencyDisorders />} />
            <Route path="/dashboard/speech/dysphagia" element={<DysphagiaCenter />} />
            <Route path="/dashboard/speech/autism" element={<AutismCommunication />} />
            <Route path="/dashboard/speech/cognitive" element={<CognitiveCommunication />} />
            <Route path="/dashboard/speech/plans" element={<SpeechTreatmentPlans />} />
            <Route path="/dashboard/speech/sessions" element={<SpeechTherapySessions />} />
            <Route path="/dashboard/speech/family" element={<FamilyTraining />} />
            <Route path="/dashboard/speech/home-program" element={<HomeProgramCenter />} />
            <Route path="/dashboard/speech/teletherapy" element={<Teletherapy />} />
            <Route path="/dashboard/speech/child" element={<ChildSpeechTherapy />} />
            <Route path="/dashboard/speech/adult" element={<AdultSpeechTherapy />} />
            <Route path="/dashboard/speech/inpatient" element={<InpatientSpeech />} />
            <Route path="/dashboard/speech/outpatient" element={<OutpatientSpeech />} />
            <Route path="/dashboard/speech/smart" element={<SmartTaskQueue />} />
            <Route path="/dashboard/speech/offline" element={<OfflineSync />} />
            <Route path="/dashboard/speech/followup" element={<SpeechFollowUp />} />
            <Route path="/dashboard/speech/timeline" element={<SpeechTimeline />} />
            <Route path="/dashboard/speech/billing" element={<SpeechBilling />} />
            <Route path="/dashboard/speech/research" element={<SpeechResearch />} />
            <Route path="/dashboard/speech/reports" element={<SpeechReports />} />
            <Route path="/dashboard/speech/comms" element={<SpeechComms />} />
            <Route path="/dashboard/speech/alerts" element={<SpeechAlerts />} />
            <Route path="/dashboard/speech/mobile" element={<SpeechMobile />} />
            <Route path="/dashboard/speech/config" element={<SpeechConfig />} />
            {/* Nutrition & Dietetics */}
            <Route path="/dashboard/nutrition" element={<NutritionDashboard />} />
            <Route path="/dashboard/nutrition/referrals" element={<NutritionReferralCenter />} />
            <Route path="/dashboard/nutrition/assessments" element={<NutritionAssessmentCenter />} />
            <Route path="/dashboard/nutrition/anthropometric" element={<AnthropometricCenter />} />
            <Route path="/dashboard/nutrition/malnutrition" element={<MalnutritionScreening />} />
            <Route path="/dashboard/nutrition/diet-plans" element={<DietPlanManagement />} />
            <Route path="/dashboard/nutrition/therapeutic" element={<TherapeuticDiets />} />
            <Route path="/dashboard/nutrition/inpatient" element={<InpatientFeeding />} />
            <Route path="/dashboard/nutrition/enteral" element={<EnteralFeeding />} />
            <Route path="/dashboard/nutrition/catering" element={<CateringKitchen />} />
            <Route path="/dashboard/nutrition/allergy" element={<AllergyRestrictions />} />
            <Route path="/dashboard/nutrition/counselling" element={<NutritionCounselling />} />
            <Route path="/dashboard/nutrition/child" element={<ChildNutrition />} />
            <Route path="/dashboard/nutrition/addiction" element={<AddictionRecoveryNutrition />} />
            <Route path="/dashboard/nutrition/psychogeriatric" element={<PsychogeriatricNutrition />} />
            <Route path="/dashboard/nutrition/community" element={<CommunityNutrition />} />
            <Route path="/dashboard/nutrition/outpatient" element={<OutpatientNutrition />} />
            <Route path="/dashboard/nutrition/followup" element={<NutritionFollowUp />} />
            <Route path="/dashboard/nutrition/timeline" element={<NutritionTimeline />} />
            <Route path="/dashboard/nutrition/billing" element={<NutritionBilling />} />
            <Route path="/dashboard/nutrition/research" element={<NutritionResearch />} />
            <Route path="/dashboard/nutrition/reports" element={<NutritionReports />} />
            <Route path="/dashboard/nutrition/comms" element={<NutritionComms />} />
            <Route path="/dashboard/nutrition/alerts" element={<NutritionAlerts />} />
            <Route path="/dashboard/nutrition/offline" element={<NutritionOffline />} />
            <Route path="/dashboard/nutrition/mobile" element={<NutritionMobile />} />
            <Route path="/dashboard/nutrition/config" element={<NutritionConfig />} />
            {/* Social Work & Community Support */}
            <Route path="/dashboard/socialwork" element={<SocialWorkDashboard />} />
            <Route path="/dashboard/socialwork/referrals" element={<SocialWorkReferralCenter />} />
            <Route path="/dashboard/socialwork/assessments" element={<SocialAssessmentCenter />} />
            <Route path="/dashboard/socialwork/family" element={<FamilyAssessment />} />
            <Route path="/dashboard/socialwork/home-visits" element={<HomeVisits />} />
            <Route path="/dashboard/socialwork/reintegration" element={<SwCommunityReintegration />} />
            <Route path="/dashboard/socialwork/trial-leave" element={<TrialLeave />} />
            <Route path="/dashboard/socialwork/discharge" element={<SwDischargeAftercare />} />
            <Route path="/dashboard/socialwork/child" element={<ChildWelfare />} />
            <Route path="/dashboard/socialwork/elder" element={<ElderWelfare />} />
            <Route path="/dashboard/socialwork/addiction" element={<AddictionRecoverySupport />} />
            <Route path="/dashboard/socialwork/legal" element={<LegalLiaison />} />
            <Route path="/dashboard/socialwork/vulnerable" element={<VulnerablePatients />} />
            <Route path="/dashboard/socialwork/welfare" element={<WelfareSupport />} />
            <Route path="/dashboard/socialwork/community" element={<CommunityFollowUp />} />
            <Route path="/dashboard/socialwork/vocational" element={<VocationalReintegration />} />
            <Route path="/dashboard/socialwork/followup" element={<SocialWorkFollowUp />} />
            <Route path="/dashboard/socialwork/timeline" element={<SocialWorkTimeline />} />
            <Route path="/dashboard/socialwork/billing" element={<SocialWorkBilling />} />
            <Route path="/dashboard/socialwork/research" element={<SocialWorkResearch />} />
            <Route path="/dashboard/socialwork/reports" element={<SocialWorkReports />} />
            <Route path="/dashboard/socialwork/comms" element={<SocialWorkComms />} />
            <Route path="/dashboard/socialwork/alerts" element={<SocialWorkAlerts />} />
            <Route path="/dashboard/socialwork/offline" element={<SocialWorkOffline />} />
            <Route path="/dashboard/socialwork/mobile" element={<SocialWorkMobile />} />
            <Route path="/dashboard/socialwork/config" element={<SocialWorkConfig />} />
            {/* ICU / Critical Care */}
            <Route path="/dashboard/icu" element={<IcuDashboard />} />
            <Route path="/dashboard/icu/admissions" element={<IcuAdmissionCenter />} />
            <Route path="/dashboard/icu/beds" element={<IcuBedManagement />} />
            <Route path="/dashboard/icu/observation" element={<IcuObservation />} />
            <Route path="/dashboard/icu/charts" element={<IcuCharts />} />
            <Route path="/dashboard/icu/ventilator" element={<IcuVentilator />} />
            <Route path="/dashboard/icu/code-blue" element={<IcuCodeBlue />} />
            <Route path="/dashboard/icu/medication" element={<IcuMedication />} />
            <Route path="/dashboard/icu/laboratory" element={<IcuLaboratory />} />
            <Route path="/dashboard/icu/radiology" element={<IcuRadiology />} />
            <Route path="/dashboard/icu/nutrition" element={<IcuNutrition />} />
            <Route path="/dashboard/icu/rehab" element={<IcuRehab />} />
            <Route path="/dashboard/icu/handover" element={<IcuHandover />} />
            <Route path="/dashboard/icu/care-plans" element={<IcuCarePlans />} />
            <Route path="/dashboard/icu/transfers" element={<IcuTransfers />} />
            <Route path="/dashboard/icu/discharge" element={<IcuDischarge />} />
            <Route path="/dashboard/icu/billing" element={<IcuBilling />} />
            <Route path="/dashboard/icu/analytics" element={<IcuAnalytics />} />
            <Route path="/dashboard/icu/mortality" element={<IcuMortality />} />
            <Route path="/dashboard/icu/research" element={<IcuResearch />} />
            <Route path="/dashboard/icu/comms" element={<IcuComms />} />
            <Route path="/dashboard/icu/timeline" element={<IcuTimeline />} />
            <Route path="/dashboard/icu/followup" element={<IcuFollowUp />} />
            <Route path="/dashboard/icu/productivity" element={<IcuProductivity />} />
            <Route path="/dashboard/icu/alerts" element={<IcuAlerts />} />
            <Route path="/dashboard/icu/reports" element={<IcuReports />} />
            <Route path="/dashboard/icu/mobile" element={<IcuMobile />} />
            <Route path="/dashboard/icu/config" element={<IcuConfig />} />
            {/* Dental clinic — demonstration workspace */}
            <Route path="/dashboard/dental" element={<RequireRole roles={DENTAL_ROLES}><DentalDashboard /></RequireRole>} />
            <Route path="/dashboard/dental/patients" element={<RequireRole roles={DENTAL_ROLES}><DentalPatientList /></RequireRole>} />
            <Route path="/dashboard/dental/patients/:patientId" element={<RequireRole roles={DENTAL_ROLES}><DentalPatientProfile /></RequireRole>} />
            <Route path="/dashboard/dental/chart" element={<RequireRole roles={DENTAL_ROLES}><DentalChartPage /></RequireRole>} />
            <Route path="/dashboard/dental/chart/:patientId" element={<RequireRole roles={DENTAL_ROLES}><DentalChartPage /></RequireRole>} />
            <Route path="/dashboard/dental/encounters" element={<RequireRole roles={DENTAL_ROLES}><DentalEncounterList /></RequireRole>} />
            <Route path="/dashboard/dental/encounters/:encounterId" element={<RequireRole roles={DENTAL_ROLES}><DentalEncounterPage /></RequireRole>} />
            <Route path="/dashboard/dental/plans" element={<RequireRole roles={DENTAL_ROLES}><DentalTreatmentPlans /></RequireRole>} />
            <Route path="/dashboard/dental/procedures" element={<RequireRole roles={DENTAL_ROLES}><DentalProcedures /></RequireRole>} />
            <Route path="/dashboard/dental/prescriptions" element={<RequireRole roles={DENTAL_ROLES}><DentalPrescriptions /></RequireRole>} />
            <Route path="/dashboard/dental/investigations" element={<RequireRole roles={DENTAL_ROLES}><DentalInvestigations /></RequireRole>} />
            <Route path="/dashboard/dental/referrals" element={<RequireRole roles={DENTAL_ROLES}><DentalReferrals /></RequireRole>} />
            <Route path="/dashboard/dental/appointments" element={<RequireRole roles={DENTAL_ROLES}><DentalAppointments /></RequireRole>} />
            <Route path="/dashboard/dental/schedule" element={<RequireRole roles={DENTAL_ROLES}><DentalSchedule /></RequireRole>} />
            <Route path="/dashboard/dental/follow-ups" element={<RequireRole roles={DENTAL_ROLES}><DentalFollowUps /></RequireRole>} />
            <Route path="/dashboard/dental/services" element={<RequireRole roles={DENTAL_ROLES}><DentalServices /></RequireRole>} />
            <Route path="/dashboard/dental/inventory" element={<RequireRole roles={DENTAL_ROLES}><DentalInventory /></RequireRole>} />
            <Route path="/dashboard/dental/reports/clinical" element={<RequireRole roles={DENTAL_ROLES}><DentalClinicalReports /></RequireRole>} />
            <Route path="/dashboard/dental/reports/operational" element={<RequireRole roles={DENTAL_ROLES}><DentalOperationalReports /></RequireRole>} />
            <Route path="/dashboard/eye" element={<RequireRole roles={EYE_ROLES}><EyeDashboard /></RequireRole>} />
            <Route path="/dashboard/eye/patients" element={<RequireRole roles={EYE_ROLES}><EyePatients /></RequireRole>} />
            <Route path="/dashboard/eye/patients/:id" element={<RequireRole roles={EYE_ROLES}><EyePatients /></RequireRole>} />
            <Route path="/dashboard/eye/appointments" element={<RequireRole roles={EYE_ROLES}><EyeAppointments /></RequireRole>} />
            <Route path="/dashboard/eye/schedule" element={<RequireRole roles={EYE_ROLES}><EyeSchedule /></RequireRole>} />
            <Route path="/dashboard/eye/consultations" element={<RequireRole roles={EYE_ROLES}><EyeConsultations /></RequireRole>} />
            <Route path="/dashboard/eye/consultations/:id" element={<RequireRole roles={EYE_ROLES}><EyeConsultations /></RequireRole>} />
            <Route path="/dashboard/eye/acuity" element={<RequireRole roles={EYE_ROLES}><EyeAcuity /></RequireRole>} />
            <Route path="/dashboard/eye/refraction" element={<RequireRole roles={EYE_ROLES}><EyeRefraction /></RequireRole>} />
            <Route path="/dashboard/eye/examination" element={<RequireRole roles={EYE_ROLES}><EyeExamination /></RequireRole>} />
            <Route path="/dashboard/eye/history" element={<RequireRole roles={EYE_ROLES}><EyeHistory /></RequireRole>} />
            <Route path="/dashboard/eye/diagnoses" element={<RequireRole roles={EYE_ROLES}><EyeDiagnoses /></RequireRole>} />
            <Route path="/dashboard/eye/plans" element={<RequireRole roles={EYE_ROLES}><EyePlans /></RequireRole>} />
            <Route path="/dashboard/eye/procedures" element={<RequireRole roles={EYE_ROLES}><EyeProcedures /></RequireRole>} />
            <Route path="/dashboard/eye/prescriptions" element={<RequireRole roles={EYE_ROLES}><EyePrescriptions /></RequireRole>} />
            <Route path="/dashboard/eye/investigations" element={<RequireRole roles={EYE_ROLES}><EyeInvestigations /></RequireRole>} />
            <Route path="/dashboard/eye/referrals" element={<RequireRole roles={EYE_ROLES}><EyeReferrals /></RequireRole>} />
            <Route path="/dashboard/eye/follow-ups" element={<RequireRole roles={EYE_ROLES}><EyeFollowUps /></RequireRole>} />
            <Route path="/dashboard/eye/education" element={<RequireRole roles={EYE_ROLES}><EyeEducation /></RequireRole>} />
            <Route path="/dashboard/eye/spectacles" element={<RequireRole roles={EYE_ROLES}><EyeSpectacles /></RequireRole>} />
            <Route path="/dashboard/eye/contact-lenses" element={<RequireRole roles={EYE_ROLES}><EyeContactLenses /></RequireRole>} />
            <Route path="/dashboard/eye/rooms" element={<RequireRole roles={EYE_ROLES}><EyeRooms /></RequireRole>} />
            <Route path="/dashboard/eye/equipment" element={<RequireRole roles={EYE_ROLES}><EyeEquipment /></RequireRole>} />
            <Route path="/dashboard/eye/inventory" element={<RequireRole roles={EYE_ROLES}><EyeInventory /></RequireRole>} />
            <Route path="/dashboard/eye/reports/clinical" element={<RequireRole roles={EYE_ROLES}><EyeClinicalReports /></RequireRole>} />
            <Route path="/dashboard/eye/reports/operational" element={<RequireRole roles={EYE_ROLES}><EyeOperationalReports /></RequireRole>} />
            <Route path="/dashboard/paeds" element={<RequireRole roles={PAEDS_ROLES}><PaedsDashboard /></RequireRole>} />
            <Route path="/dashboard/paeds/patients" element={<RequireRole roles={PAEDS_ROLES}><PaedsPatients /></RequireRole>} />
            <Route path="/dashboard/paeds/patients/:id" element={<RequireRole roles={PAEDS_ROLES}><PaedsPatients /></RequireRole>} />
            <Route path="/dashboard/paeds/appointments" element={<RequireRole roles={PAEDS_ROLES}><PaedsAppointments /></RequireRole>} />
            <Route path="/dashboard/paeds/encounters" element={<RequireRole roles={PAEDS_ROLES}><PaedsEncounters /></RequireRole>} />
            <Route path="/dashboard/paeds/encounters/:id" element={<RequireRole roles={PAEDS_ROLES}><PaedsEncounters /></RequireRole>} />
            <Route path="/dashboard/paeds/triage" element={<RequireRole roles={PAEDS_ROLES}><PaedsTriage /></RequireRole>} />
            <Route path="/dashboard/paeds/growth" element={<RequireRole roles={PAEDS_ROLES}><PaedsGrowth /></RequireRole>} />
            <Route path="/dashboard/paeds/development" element={<RequireRole roles={PAEDS_ROLES}><PaedsDevelopment /></RequireRole>} />
            <Route path="/dashboard/paeds/newborn" element={<RequireRole roles={PAEDS_ROLES}><PaedsNewborn /></RequireRole>} />
            <Route path="/dashboard/paeds/immunisation" element={<RequireRole roles={PAEDS_ROLES}><PaedsImmunisation /></RequireRole>} />
            <Route path="/dashboard/paeds/nutrition" element={<RequireRole roles={PAEDS_ROLES}><PaedsNutrition /></RequireRole>} />
            <Route path="/dashboard/paeds/child-health" element={<RequireRole roles={PAEDS_ROLES}><PaedsChildHealth /></RequireRole>} />
            <Route path="/dashboard/paeds/diagnoses" element={<RequireRole roles={PAEDS_ROLES}><PaedsDiagnoses /></RequireRole>} />
            <Route path="/dashboard/paeds/plans" element={<RequireRole roles={PAEDS_ROLES}><PaedsPlans /></RequireRole>} />
            <Route path="/dashboard/paeds/procedures" element={<RequireRole roles={PAEDS_ROLES}><PaedsProcedures /></RequireRole>} />
            <Route path="/dashboard/paeds/prescriptions" element={<RequireRole roles={PAEDS_ROLES}><PaedsPrescriptions /></RequireRole>} />
            <Route path="/dashboard/paeds/investigations" element={<RequireRole roles={PAEDS_ROLES}><PaedsInvestigations /></RequireRole>} />
            <Route path="/dashboard/paeds/referrals" element={<RequireRole roles={PAEDS_ROLES}><PaedsReferrals /></RequireRole>} />
            <Route path="/dashboard/paeds/follow-ups" element={<RequireRole roles={PAEDS_ROLES}><PaedsFollowUps /></RequireRole>} />
            <Route path="/dashboard/paeds/admissions" element={<RequireRole roles={PAEDS_ROLES}><PaedsAdmissions /></RequireRole>} />
            <Route path="/dashboard/paeds/wards" element={<RequireRole roles={PAEDS_ROLES}><PaedsWards /></RequireRole>} />
            <Route path="/dashboard/paeds/observations" element={<RequireRole roles={PAEDS_ROLES}><PaedsObservations /></RequireRole>} />
            <Route path="/dashboard/paeds/discharge" element={<RequireRole roles={PAEDS_ROLES}><PaedsDischarge /></RequireRole>} />
            <Route path="/dashboard/paeds/emergency" element={<RequireRole roles={PAEDS_ROLES}><PaedsEmergency /></RequireRole>} />
            <Route path="/dashboard/paeds/services" element={<RequireRole roles={PAEDS_ROLES}><PaedsServices /></RequireRole>} />
            <Route path="/dashboard/paeds/equipment" element={<RequireRole roles={PAEDS_ROLES}><PaedsEquipment /></RequireRole>} />
            <Route path="/dashboard/paeds/reports/clinical" element={<RequireRole roles={PAEDS_ROLES}><PaedsClinicalReports /></RequireRole>} />
            <Route path="/dashboard/paeds/reports/growth" element={<RequireRole roles={PAEDS_ROLES}><PaedsGrowthReports /></RequireRole>} />
            <Route path="/dashboard/paeds/reports/immunisation" element={<RequireRole roles={PAEDS_ROLES}><PaedsImmunisationReports /></RequireRole>} />
            <Route path="/dashboard/paeds/reports/operational" element={<RequireRole roles={PAEDS_ROLES}><PaedsOperationalReports /></RequireRole>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ChatNotificationProvider>
        </BrowserRouter>
        </AdminProvider>
        </PaedsProvider>
        </EyeProvider>
        </DentalProvider>
        </RadiologyProvider>
        </NursingProvider>
        </LabFlowProvider>
        </BillingStoreProvider>
        </DatabaseProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
