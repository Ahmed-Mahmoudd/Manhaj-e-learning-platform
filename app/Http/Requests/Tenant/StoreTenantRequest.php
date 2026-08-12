<?php

namespace App\Http\Requests\Tenant;

use Illuminate\Foundation\Http\FormRequest;

class StoreTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'            => ['required', 'string', 'max:255'],
            'subdomain'       => ['required', 'string', 'max:100', 'unique:tenants,subdomain', 'regex:/^[a-z0-9\-]+$/'],
            'locale'          => ['nullable', 'string', 'max:10'],
            'timezone'        => ['nullable', 'string', 'max:50'],
            'grading_system'  => ['nullable', 'string', 'in:letter,gpa,percentage'],
            'is_active'       => ['boolean'],
            'settings'        => ['nullable', 'array'],
        ];
    }
}
