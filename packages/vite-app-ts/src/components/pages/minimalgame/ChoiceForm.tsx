import React, { FC } from 'react';

import { Button, Select, Form } from 'antd';

export interface IChoiceFormProps {
    onSubmit: any
}


export const ChoiceForm: FC<IChoiceFormProps> = (props) => {
    const [form] = Form.useForm();

    const onFinish = (values: any) => {
        props.onSubmit(values.choice)
    };

    return (
        <div>
            <Form form={form} onFinish={onFinish} initialValues={{ choice: "" }}>
                <Form.Item name="choice" label="Choice" rules={[{ required: true }]}>
                    <Select onChange={() => { }}>
                        <Select.Option value="" disabled>Make a choice</Select.Option>
                        <Select.Option value="rock">Rock</Select.Option>
                        <Select.Option value="paper">Paper</Select.Option>
                        <Select.Option value="scissors">Scissors</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit">
                        Submit
                    </Button>
                </Form.Item>
            </Form>
        </div >
    );
}
