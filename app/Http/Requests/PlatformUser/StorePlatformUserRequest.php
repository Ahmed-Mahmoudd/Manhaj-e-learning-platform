<?php

namespace App\Http\Requests\PlatformUser;

use Illuminate\Foundation\Http\FormRequest;

class StorePlatformUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'      => ['required', 'string', 'max:255'],
            'email'     => ['required', 'email', 'unique:users,email'],
            'role'      => ['required', 'string', 'in:platform_admin,university_admin,instructor,teaching_assistant,student'],
            'tenant_id' => ['nullable', 'integer', 'exists:tenants,id'],
            'password'  => ['nullable', 'string', 'min:8'],
        ];
    }
}
