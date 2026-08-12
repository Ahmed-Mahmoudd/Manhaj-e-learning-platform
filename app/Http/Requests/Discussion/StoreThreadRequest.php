<?php

namespace App\Http\Requests\Discussion;

use App\Models\DiscussionThread;
use Illuminate\Foundation\Http\FormRequest;

class StoreThreadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'body'  => ['required', 'string'],
            'type'  => ['required', 'string', 'in:' . implode(',', DiscussionThread::TYPES)],
        ];
    }
}
