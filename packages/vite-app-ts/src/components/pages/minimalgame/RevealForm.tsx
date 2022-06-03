import React, { FC } from 'react';

import { Button, Select, Form } from 'antd';

export interface IRevealFormProps {
    onSubmit: any,
    opponent: string
}

export const RevealForm: FC<IRevealFormProps> = (props) => {
    const [form] = Form.useForm();

    const onFinish = (values: any) => {
        props.onSubmit()
    };

    return (
        <div>
            <Form form={form} onFinish={onFinish} initialValues={{}}>
                <Form.Item>
                    <div>You are playing against {props.opponent}</div>
                    <div>Are you ready to reveal your choice?</div>
                    <Button type="primary" htmlType="submit">
                        Reveal
                    </Button>
                </Form.Item>
            </Form>
        </div >
    );
}
