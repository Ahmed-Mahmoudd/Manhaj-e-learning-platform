import { describe, expect, it } from 'vitest';
import { displayRole, homePathForRole } from '@/auth/roles';

describe('roles utility', () => {
    it('returns correct home path for each role', () => {
        expect(homePathForRole('platform_admin')).toBe('/platform');
        expect(homePathForRole('university_admin')).toBe('/admin');
        expect(homePathForRole('faculty_admin')).toBe('/admin');
        expect(homePathForRole('instructor')).toBe('/instructor');
        expect(homePathForRole('teaching_assistant')).toBe('/instructor');
        expect(homePathForRole('student')).toBe('/student');
    });

    it('displays translated role names in English and Arabic', () => {
        expect(displayRole('faculty_admin', 'en')).toBe('Faculty Admin');
        expect(displayRole('faculty_admin', 'ar')).toBe('مدير الكلية');

        expect(displayRole('university_admin', 'en')).toBe('University Admin');
        expect(displayRole('university_admin', 'ar')).toBe('مدير الجامعة');

        expect(displayRole('instructor', 'en')).toBe('Instructor');
        expect(displayRole('instructor', 'ar')).toBe('عضو هيئة التدريس');

        expect(displayRole('teaching_assistant', 'en')).toBe('Teaching Assistant');
        expect(displayRole('teaching_assistant', 'ar')).toBe('معيد');

        expect(displayRole('student', 'en')).toBe('Student');
        expect(displayRole('student', 'ar')).toBe('طالب');
    });
});
