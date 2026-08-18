<?php

namespace App\Http\Requests\User;

use App\Http\Controllers\Api\V1\Admin\UserAdminController;
use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'unique:users,email'],
            'role'     => [
                'required',
                'string',
                'in:' . implode(',', UserAdminController::FACULTY_MANAGEABLE_ROLES),
            ],
            'password' => ['required', 'string', 'min:8'],
        ];
    }
}
