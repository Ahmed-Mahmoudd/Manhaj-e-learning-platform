<?php

namespace App\Http\Requests\Discussion;

use Illuminate\Foundation\Http\FormRequest;

class AddPostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'body'           => ['required', 'string'],
            'parent_post_id' => ['nullable', 'integer', 'exists:discussion_posts,id'],
        ];
    }
}
