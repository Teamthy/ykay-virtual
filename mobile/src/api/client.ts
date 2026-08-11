import { offlineStorage } from './storage';

export interface Programme {
  id: string;
  title: string;
  curriculum: string;
  level: string;
  subject: string;
  format: string;
  summary: string;
  price: number;
}

export interface EnrollmentRequest {
  programmeId: string;
  parentEmail: string;
  learnerName: string;
}

export interface EnrollmentResponse {
  enrollment: {
    id: string;
    programmeId: string;
    parentEmail: string;
    learnerName: string;
    status: string;
  };
}

const BASE_URL = 'http://localhost:8080/api/v1';

export class ApiClient {
  static async getProgrammes(): Promise<Programme[]> {
    const cacheKey = 'programmes_public';
    try {
      const response = await fetch(`${BASE_URL}/programmes?public=true`);
      if (response.ok) {
        const data = await response.json();
        await offlineStorage.setCache(cacheKey, data);
        return data;
      }
    } catch (err) {
      // Offline fallback (§14: offline-first for reads)
      const cached = await offlineStorage.getCache<Programme[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }
    // Return sample offline fallback catalogue if network is down and cache empty
    return [
      {
        id: 'prog-igcse-cs',
        title: 'IGCSE Computer Science',
        curriculum: 'British Curriculum',
        level: 'IGCSE',
        subject: 'Computer Science',
        format: 'Cohort',
        summary: 'Structured online preparation for IGCSE Computer Science with live lessons.',
        price: 25000,
      },
      {
        id: 'prog-waec-maths',
        title: 'WAEC Mathematics Revision',
        curriculum: 'Nigerian Curriculum',
        level: 'SSS3',
        subject: 'Mathematics',
        format: 'Private Tuition',
        summary: 'Exam-focused revision for WAEC and school assessment preparation.',
        price: 18000,
      },
    ];
  }

  static async createEnrollment(req: EnrollmentRequest): Promise<EnrollmentResponse> {
    const response = await fetch(`${BASE_URL}/enrollments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Enrollment failed');
    }
    return response.json();
  }
}
