<?php

namespace App\Http\Requests\User;

use App\Http\Controllers\Api\V1\Admin\UserAdminController;
use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'role' => ['required', 'string', 'in:' . implode(',', UserAdminController::MANAGEABLE_ROLES)],
        ];
    }
}
